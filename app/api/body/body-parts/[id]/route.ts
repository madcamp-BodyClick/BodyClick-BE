import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Auth 관련 import는 이제 필요 없으므로 삭제했습니다.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bodyPartId = parseInt(id); 
    if (isNaN(bodyPartId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // 1. 조회수 증가 및 상세 정보 조회
    // (기록은 따로 저장하지만, '인기 부위' 산정을 위해 전체 조회수(viewCount)는 여기서 올리는 게 맞습니다)
    const bodyPart = await prisma.bodyPart.update({
      where: { id: bodyPartId },
      data: {
        viewCount: { increment: 1 }, 
      },
      include: {
        system: true,
        // 필요하다면 diseases 등 다른 연관 관계도 여기서 include 하세요
      }
    });

    // 2. [삭제됨] 검색 기록 저장 로직
    // 이유: 이제 클라이언트에서 /api/common/history API를 호출하여 처리합니다.

    return NextResponse.json({
      success: true,
      data: bodyPart,
    });

  } catch (error) {
    console.error("BodyPart Detail Error:", error);
    return NextResponse.json({ error: "Body Part not found" }, { status: 404 });
  }
}