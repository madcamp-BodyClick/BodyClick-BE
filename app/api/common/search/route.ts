import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // 1. Query Parameter (keyword) 파싱
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    // 2. DB 검색 (한글명 또는 영문명에 키워드가 포함된 경우)
    const results = await prisma.bodyPart.findMany({
      where: {
        OR: [
          { nameKo: { contains: keyword } }, // Postgres의 경우 mode: 'insensitive' 추가 가능
          { nameEn: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      include: {
        system: true,
      },
      take: 20, // 너무 많은 결과 방지
    });

    // 3. 포맷팅
    const formattedData = results.map((bp) => ({
      id: bp.id,
      name: bp.nameKo,
      system_name: bp.system.nameKo,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
    });

  } catch (error) {
    console.error("GET /common/search Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}