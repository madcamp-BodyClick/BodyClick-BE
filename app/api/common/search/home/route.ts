import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // 1. 인기 신체 부위 조회 (모든 유저 대상, 조회수 높은 순 TOP 5)
    const popularBodyParts = await prisma.bodyPart.findMany({
      orderBy: { viewCount: 'desc' },
      take: 5,
      include: {
        system: true, // 시스템명(소화계 등) 가져오기 위함
      },
    });

    // 인기 부위 포맷팅
    const formattedPopular = popularBodyParts.map((bp) => ({
      id: bp.id,
      name: bp.nameKo,
      system_name: bp.system.nameKo,
      view_count: bp.viewCount,
    }));

    // 2. 나의 최근 기록 조회 (로그인 유저만)
    let myRecentHistory: any[] = [];

    if (session?.user?.email) {
      const history = await prisma.searchHistory.findMany({
        where: { user: { email: session.user.email } },
        orderBy: { createdAt: 'desc' },
        take: 10, // 최근 10개만
        include: {
          bodyPart: true,
        },
      });

      // 기록 포맷팅 (현재 DB 구조상 'view' 타입만 존재)
      myRecentHistory = history.map((h) => ({
        history_id: h.id,
        type: "view", // 사용자가 상세 페이지를 조회함
        keyword: h.bodyPart.nameKo, // 키워드 대신 부위명 표시
        body_part_id: h.bodyPartId,
        searched_at: h.createdAt,
      }));
    }

    // 3. 응답 반환
    return NextResponse.json({
      success: true,
      data: {
        popular_body_parts: formattedPopular,
        my_recent_history: myRecentHistory,
      },
    });

  } catch (error) {
    console.error("GET /common/search/home Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}