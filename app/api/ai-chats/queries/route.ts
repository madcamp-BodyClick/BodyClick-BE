import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type AnswerPayload = {
  answer: string;
  confidence_score: number;
};

const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return key;
}

async function callGeminiJSON<T>(systemPrompt: string, userMessage: string): Promise<T> {
  const key = getGeminiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "system", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userMessage }] },
      ],
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

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini response missing text");
  }

  // Enforce strict JSON output to avoid free-text leakage.
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON from Gemini: ${(error as Error).message}`);
  }
}

function buildAnswerPrompt(bodyPartLabel: string): string {
  return [
    "You are a medical information assistant.",
    "Provide a short, cautious answer in Korean without diagnosing or prescribing.",
    "Mention that persistent or severe symptoms should be evaluated by a clinician.",
    `Body part context: ${bodyPartLabel}.`,
    "Output JSON only with schema:",
    '{ "answer": string, "confidence_score": number }',
    "confidence_score is 0 to 1.",
    "Return ONLY valid JSON. No extra text.",
  ].join("\n");
}

async function answerAgent(question: string, bodyPartLabel: string): Promise<AnswerPayload> {
  const prompt = buildAnswerPrompt(bodyPartLabel);
  return callGeminiJSON<AnswerPayload>(prompt, question);
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const bodyPart = await prisma.bodyPart.findUnique({
      where: { id: body_part_id },
      select: { nameKo: true, nameEn: true },
    });
    if (!bodyPart) {
      return NextResponse.json({ error: "Body part not found" }, { status: 404 });
    }

    const bodyPartLabel = bodyPart.nameKo
      ? `${bodyPart.nameKo}${bodyPart.nameEn ? ` (${bodyPart.nameEn})` : ""}`
      : bodyPart.nameEn || "unknown";
    const aiAnswer = await answerAgent(question, bodyPartLabel);
    const parsedConfidence = Number(aiAnswer.confidence_score);
    const confidence =
      Number.isFinite(parsedConfidence) && parsedConfidence >= 0
        ? Math.min(parsedConfidence, 1)
        : 0.5;

    const saved = await prisma.userQuery.create({
      data: {
        userId: token.sub,
        bodyPartId: body_part_id,
        question,
        answer: aiAnswer.answer,
        confidenceScore: confidence,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: saved.id,
          answer: saved.answer,
          confidence_score: saved.confidenceScore,
          created_at: saved.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
