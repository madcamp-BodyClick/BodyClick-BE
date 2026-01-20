// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// API 키 확인
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Gemini API Key is missing");

const genAI = new GoogleGenerativeAI(apiKey);
const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// 텍스트 -> 벡터 변환 함수
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const cleanText = text.replace(/\n/g, " ");
    const result = await embedModel.embedContent(cleanText);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding Error:", error);
    throw new Error("Failed to generate embedding");
  }
}