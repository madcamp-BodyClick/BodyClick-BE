import { NextRequest, NextResponse } from "next/server"; // NextRequest 추가
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest, // [중요] Request 대신 NextRequest 사용
  // [중요] params를 Promise 타입으로 정의
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // [중요] params를 await로 풀어서 id를 꺼냄
    const { id } = await params;

    const bodyPartId = parseInt(id); 
    if (isNaN(bodyPartId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const session = await getServerSession(authOptions);

    // 1. 조회수 증가 및 조회
    const bodyPart = await prisma.bodyPart.update({
      where: { id: bodyPartId },
      data: {
        viewCount: { increment: 1 }, 
      },
      include: {
        system: true,
      }
    });

    // 2. 검색 기록 저장 (비동기 처리 유지)
    if (session?.user?.email) {
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
    return NextResponse.json({ error: "Body Part not found" }, { status: 404 });
  }
}