import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma"; // ⚠️ 본인 프로젝트의 prisma 경로 확인 (@/lib/prisma 등)

// Gemini API 설정
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// 검색 결과 타입 정의 (Prisma Raw Query 결과값)
interface SearchResult {
  id: number;
  content: string;
  category: string;
  similarity: number;
}

export async function searchMedicalKnowledge(query: string): Promise<string> {
  try {
    // 1. 🤖 사용자 질문을 벡터(숫자 배열)로 변환
    const result = await embeddingModel.embedContent(query);
    const queryVector = result.embedding.values;

    // 2. 🧮 벡터를 PostgreSQL(pgvector)이 이해할 수 있는 문자열로 변환
    // 예: [0.123, -0.456, ...] 형태의 문자열이 됩니다.
    const vectorQuery = JSON.stringify(queryVector);

    // 3. 🔍 벡터 유사도 검색 (Cosine Distance)
    // 1 - (embedding <=> query) 공식을 써서 유사도(0~1)를 구합니다.
    // 참고: 현재 DB 스키마에 body_part_id가 없으므로 해당 필터링은 제거했습니다.
    const searchResults = await prisma.$queryRaw<SearchResult[]>`
      SELECT 
        id, 
        content,
        category,
        1 - (embedding <=> ${vectorQuery}::vector) as similarity
      FROM "medical_knowledge"
      WHERE 1 - (embedding <=> ${vectorQuery}::vector) > 0.6
      ORDER BY similarity DESC
      LIMIT 3;
    `;

    // 4. 📝 검색 결과를 하나의 문자열로 합침 (Context 생성)
    if (searchResults.length === 0) {
      console.log("⚠️ 관련 의학 지식을 찾지 못했습니다.");
      return ""; 
    }

    // AI에게 제공할 참고 지식 포맷팅
    const contextText = searchResults
      .map((r:SearchResult, i: number) => `[참고지식 ${i + 1} | ${r.category}]\n${r.content}`)
      .join("\n\n");

    console.log(`✅ RAG 검색 성공: ${searchResults.length}개의 지식을 찾았습니다.`);
    return contextText;

  } catch (error) {
    console.error("❌ RAG 검색 중 오류 발생:", error);
    return ""; // 에러 발생 시 빈 문자열 반환하여 채팅이 멈추지 않게 함
  }
}