import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  return key;
}

// AI 응답 타입 정의 (명세서 반영)
interface GeminiResponse {
  answer: string;
  confidence_score: number;
  risk_level: number;       // 1~5
  updated_summary: string;  // 대화 문맥 요약
}

// Gemini 호출 함수
async function callGeminiJSON<T>(systemPrompt: string, userMessage: string): Promise<T> {
  const key = getGeminiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response missing text");

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }
}

// 프롬프트 생성기 (업그레이드됨)
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
    // 1. 인증 확인
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 입력값 검증 (previous_summary 추가)
    const body = await request.json();
    const schema = z.object({
      body_part_id: z.number(),
      question: z.string().min(1),
      previous_summary: z.string().optional(), // 명세서 Request 반영
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
    
    // 4. AI 답변 생성 (summary와 risk_level 요청 포함)
    const aiResponse = await callGeminiJSON<GeminiResponse>(
      buildAnswerPrompt(label, previous_summary),
      question
    );

    // 5. DB 저장
    // 참고: UserMedicalContext 테이블이 있다면 거기에도 update가 필요할 수 있음
    // 여기서는 채팅 로그(UserQuery) 위주로 저장
    const saved = await prisma.userQuery.create({
      data: {
        userId: token.sub,
        bodyPartId: bodyPart.id,
        question: question,
        answer: aiResponse.answer,
        confidenceScore: aiResponse.confidence_score,
        // riskLevel 등은 별도 테이블이나 JSON 컬럼에 저장 필요 (스키마에 따라 조정)
      },
    });

    // 6. 명세서에 맞춘 최종 응답 생성
    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        answer: saved.answer,
        confidence_score: saved.confidenceScore,
        created_at: saved.createdAt,
        
        // ★ [추가] 명세서의 medical_context 필드 구현
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