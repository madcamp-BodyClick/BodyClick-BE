import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// [중요] 전체 목록 조회이므로 params가 필요 없습니다.
export async function GET() {
  try {
    const bodyParts = await prisma.bodyPart.findMany({
      orderBy: {
        id: 'asc', // 정렬 기준 예시
      },
      // 필요한 필드만 선택 (선택 사항)
      // select: { id: true, name: true, ... }
    });

    return NextResponse.json({
      success: true,
      count: bodyParts.length,
      data: bodyParts,
    });
  } catch (error) {
    console.error("GET /body-parts Error:", error);
    return NextResponse.json(
      { success: false, message: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}