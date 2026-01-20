// app/api/ai-chats/utils/search.ts
import { prisma } from "@/lib/prisma"; // prisma client 경로에 맞게 수정
import { getEmbedding } from "@/lib/gemini";

// 검색 결과 타입 정의
interface SearchResult {
  id: number;
  content: string;
  category: string;
  similarity: number;
}

export async function searchMedicalKnowledge(
  query: string, 
  bodyPartId?: number // (선택) 특정 부위만 검색하고 싶을 때
): Promise<string> {
  
  // 1. 질문을 벡터로 변환
  const queryVector = await getEmbedding(query);
  
  // 2. 벡터를 SQL에서 쓸 수 있는 문자열 포맷으로 변환 ('[0.1, 0.2, ...]')
  const vectorString = `[${queryVector.join(",")}]`;

  // 3. 벡터 유사도 검색 (Cosine Distance)
  // 1 - (embedding <=> query) 공식을 써서 유사도(0~1)를 구합니다.
  // bodyPartId가 있으면 해당 부위 지식만 필터링합니다 (하이브리드 검색).
  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT 
      id, 
      content,
      category,
      1 - (embedding <=> ${vectorString}::vector) as similarity
    FROM medical_knowledge
    WHERE 1 - (embedding <=> ${vectorString}::vector) > 0.6 -- 유사도 0.6 이상만 (임계값 조절 가능)
    ${bodyPartId ? prisma.sql`AND body_part_id = ${bodyPartId}` : prisma.sql``}
    ORDER BY similarity DESC
    LIMIT 3;
  `;

  // 4. 검색 결과를 하나의 문자열로 합침
  if (results.length === 0) {
    return ""; // 검색 결과가 없으면 빈 문자열 반환
  }

  // 예: "[참고지식 1] (위염): 위염은 ..."
  return results
    .map((r: SearchResult, i: number) => `[Medical Fact ${i + 1}] (${r.category}): ${r.content}`)
    .join("\n\n");
}
