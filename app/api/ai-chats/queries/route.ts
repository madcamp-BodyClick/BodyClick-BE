import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// 👇 [추가] RAG 검색 유틸리티 가져오기 (경로에 주의하세요!)
import { searchMedicalKnowledge } from "../utils/search";

const GEMINI_MODEL = "gemini-2.0-flash"; // 최신 모델 사용 권장 (gemini-1.5-flash 또는 gemini-2.0-flash)

function getGeminiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  return key;
}

interface GeminiResponse {
  answer: string;
  confidence_score: number;
  risk_level: number;
  updated_summary: string;
}

// JSON 파싱 안정성을 위한 유틸리티
function cleanGeminiJson(text: string): string {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function callGeminiJSON<T>(systemPrompt: string, userMessage: string): Promise<T> {
  const key = getGeminiKey();
  const genAI = new GoogleGenerativeAI(key);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    generationConfig: {
      temperature: 0.2, // RAG 사용 시 사실 기반 답변을 위해 온도를 낮춤
      responseMimeType: "application/json",
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });

  try {
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("Gemini response missing text");

    const cleanText = cleanGeminiJson(text);
    return JSON.parse(cleanText) as T;
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    throw new Error(`Gemini generation failed: ${(error as Error).message}`);
  }
}

// 👇 [수정] ragContext(검색된 지식)를 받을 수 있도록 파라미터 추가
function buildAnswerPrompt(bodyPartLabel: string, previousSummary?: string, ragContext?: string): string {
  let contextSection = `Current context - Body Part: ${bodyPartLabel}.`;
  
  if (previousSummary) {
    contextSection += `\nPrevious Context Summary: ${previousSummary}`;
  } else {
    contextSection += "\nNo previous context.";
  }

  // RAG 지식이 있으면 프롬프트에 추가
  if (ragContext) {
    contextSection += `\n\n[Medical Knowledge Base (Reference)]:\n${ragContext}\n\nIMPORTANT: Use the information from the [Medical Knowledge Base] above to answer the user's question accurately. If the information is not sufficient, rely on general medical knowledge but be conservative.`;
  }

  return [
    "You are a helpful medical AI assistant.",
    "Respond in Korean.",
    contextSection,
    "",
    "Analyze the user's symptom and provide a JSON response.",
    "The schema must be exactly:",
    "{",
    '  "answer": "string (medical advice based on the Knowledge Base if available)",',
    '  "confidence_score": "number (0.0-1.0)",',
    '  "risk_level": "integer (1=safe, 5=emergency)",',
    '  "updated_summary": "string (summarize current symptom + previous context for future reference)"',
    "}"
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    console.log("1. API 요청 도착");

    const session = await getServerSession(authOptions);
    
    // 디버깅용 로그
    console.log("2. 세션 확인:", session ? "존재함" : "없음");
    if (session?.user) {
      console.log("   User ID:", (session.user as any).id);
    }

    // 세션 인증 확인
    if (!session || !session.user) {
      console.log("❌ 인증 실패: 세션이 만료되었거나 존재하지 않음");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id; 
    
    if (!userId) {
       console.log("❌ 인증 실패: 세션은 있으나 User ID를 찾을 수 없음");
       return NextResponse.json({ error: "Unauthorized: Missing User ID" }, { status: 401 });
    }

    // 2. 입력값 검증
    const body = await request.json();
    const schema = z.object({
      body_part_id: z.number(),
      question: z.string().min(1),
      previous_summary: z.string().optional(),
    });
    
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { body_part_id, question, previous_summary } = validation.data;

    // 3. 부위 정보 조회
    const bodyPart = await prisma.bodyPart.findUnique({
      where: { id: body_part_id },
      select: { id: true, nameKo: true, nameEn: true },
    });

    if (!bodyPart) {
      return NextResponse.json({ error: "Body part not found" }, { status: 404 });
    }

    const label = bodyPart.nameKo || bodyPart.nameEn || "Unknown Part";
    
    // 👇 [추가] 4. RAG 검색 실행 (벡터 DB 조회)
    console.log(`🔍 RAG 검색 시작: "${question}"`);
    const ragContext = await searchMedicalKnowledge(question);
    
    if (ragContext) {
      console.log("✅ RAG 검색 성공: 관련 지식을 찾았습니다.");
    } else {
      console.log("⚠️ RAG 검색 결과 없음 (일반 답변으로 진행)");
    }

    // 5. AI 답변 생성 (검색된 컨텍스트 전달)
    const aiResponse = await callGeminiJSON<GeminiResponse>(
      buildAnswerPrompt(label, previous_summary, ragContext), // ragContext 추가
      question
    );

    // 6. DB 저장 (userId 사용)
    const saved = await prisma.userQuery.create({
      data: {
        userId: userId,
        bodyPartId: bodyPart.id,
        question: question,
        answer: aiResponse.answer,
        confidenceScore: aiResponse.confidence_score,
      },
    });

    // 7. 응답 생성
    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        answer: saved.answer,
        confidence_score: saved.confidenceScore,
        created_at: saved.createdAt,
        medical_context: {
          summary: aiResponse.updated_summary,
          risk_level: aiResponse.risk_level,
          is_rag_used: !!ragContext // 프론트엔드 디버깅용 (RAG 사용 여부)
        }
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Error" },
      { status: 500 }
    );
  }
}