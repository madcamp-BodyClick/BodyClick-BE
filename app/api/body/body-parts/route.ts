import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bodyPartId = parseInt(params.id);
    if (isNaN(bodyPartId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const session = await getServerSession(authOptions);

    // 1. [핵심] 조회수 증가와 데이터 조회를 동시에 수행 (update 사용)
    const bodyPart = await prisma.bodyPart.update({
      where: { id: bodyPartId },
      data: {
        viewCount: { increment: 1 }, // viewCount를 1 올림
      },
      include: {
        system: true, // 필요하다면 시스템 정보도 포함
      }
    });

    // 2. [핵심] 로그인한 유저라면 '검색 기록(SearchHistory)'에 저장
    if (session?.user?.email) {
      // 비동기로 처리하여 응답 속도 저하 방지 (await 안 붙임)
      prisma.user.findUnique({ where: { email: session.user.email } })
        .then(user => {
          if (user) {
            return prisma.searchHistory.create({
              data: {
                userId: user.id,
                bodyPartId: bodyPartId,
              }
            });
          }
        })
        .catch(err => console.error("History Save Error:", err));
    }

    return NextResponse.json({
      success: true,
      data: {
        ...bodyPart,
      },
    });

  } catch (error) {
    // 없는 ID를 조회하려 하면 update가 실패하므로 404 처리
    return NextResponse.json({ error: "Body Part not found" }, { status: 404 });
  }
}