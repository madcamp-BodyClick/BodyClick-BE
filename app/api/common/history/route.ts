// app/api/common/history/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { saveHistorySchema } from "@/lib/schemas/common";

export async function POST(request: NextRequest) {
  try {
    // 1. 세션 체크
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 2. Body 파싱 및 검증
    const body = await request.json();
    const validation = saveHistorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { body_part_id } = validation.data;

    // 3. 저장 로직 (삭제 후 생성 = 최신화)
    const [_, savedRecord] = await prisma.$transaction([
      prisma.searchHistory.deleteMany({
        where: { userId, bodyPartId: body_part_id },
      }),
      prisma.searchHistory.create({
        data: { userId, bodyPartId: body_part_id },
      }),
    ]);

    // 4. 응답
    return NextResponse.json({
      success: true,
      data: {
        id: savedRecord.id,
        user_id: savedRecord.userId,
        body_part_id: savedRecord.bodyPartId,
        created_at: savedRecord.createdAt,
      },
    });

  } catch (error) {
    console.error("History POST Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}