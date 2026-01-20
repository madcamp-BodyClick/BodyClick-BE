import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.5-flash";

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

  // 모델 인스턴스 생성
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
    // 👇 [수정 2] 문자열 대신 Enum 사용
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

function buildAnswerPrompt(bodyPartLabel: string, previousSummary?: string): string {
  return [
    "You are a helpful medical AI assistant.",
    "Respond in Korean.",
    `Current context - Body Part: ${bodyPartLabel}.`,
    previousSummary ? `Previous Context Summary: ${previousSummary}` : "No previous context.",
    "",
    "Analyze the user's symptom and provide a JSON response.",
    "The schema must be exactly:",
    "{",
    '  "answer": "string (medical advice)",',
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

    // 세션이 없거나, 유저 정보(특히 ID)가 없으면 거부
    if (!session || !session.user) {
      console.log("❌ 인증 실패: 세션이 만료되었거나 존재하지 않음");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id; 
    
    if (!userId) {
       console.log("❌ 인증 실패: 세션은 있으나 User ID를 찾을 수 없음");
       return NextResponse.json({ error: "Unauthorized: Missing User ID" }, { status: 401 });
    }
    // ============================================================

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
    
    // 4. AI 답변 생성
    const aiResponse = await callGeminiJSON<GeminiResponse>(
      buildAnswerPrompt(label, previous_summary),
      question
    );

    // 5. DB 저장 (userId 사용)
    const saved = await prisma.userQuery.create({
      data: {
        userId: userId,
        bodyPartId: bodyPart.id,
        question: question,
        answer: aiResponse.answer,
        confidenceScore: aiResponse.confidence_score,
      },
    });

    // 6. 응답 생성
    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        answer: saved.answer,
        confidence_score: saved.confidenceScore,
        created_at: saved.createdAt,
        medical_context: {
          summary: aiResponse.updated_summary,
          risk_level: aiResponse.risk_level
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