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

// 프롬프트 생성기
function buildAnswerPrompt(bodyPartLabel: string): string {
  return [
    "You are a medical information assistant.",
    "Provide a short, cautious answer in Korean.",
    `Body part context: ${bodyPartLabel}.`,
    "Output JSON only with schema:",
    '{ "answer": string, "confidence_score": number }',
    "confidence_score is 0.0 to 1.0",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인 (NextAuth)
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 입력값 검증
    const body = await request.json();
    const schema = z.object({
      body_part_id: z.number(),
      question: z.string().min(1),
    });
    
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { body_part_id, question } = validation.data;

    // 3. 부위 정보 조회 (DB에 데이터가 있어야 함)
    const bodyPart = await prisma.bodyPart.findUnique({
      where: { id: body_part_id },
      select: { id: true, nameKo: true, nameEn: true },
    });

    if (!bodyPart) {
      return NextResponse.json({ error: "Body part not found" }, { status: 404 });
    }

    const label = bodyPart.nameKo || bodyPart.nameEn || "Unknown Part";
    
    // 4. AI 답변 생성
    const aiResponse = await callGeminiJSON<{ answer: string; confidence_score: number }>(
      buildAnswerPrompt(label),
      question
    );

    // 5. DB 저장 (UserQuery 테이블 사용)
    const saved = await prisma.userQuery.create({
      data: {
        userId: token.sub,           // User UUID
        bodyPartId: bodyPart.id,     // BodyPart FK
        question: question,
        answer: aiResponse.answer,
        confidenceScore: aiResponse.confidence_score,
        // agentId는 현재 로직에서 생략하거나, 추후 매핑하여 추가 가능
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        answer: saved.answer,
        confidence_score: saved.confidenceScore,
        created_at: saved.createdAt,
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