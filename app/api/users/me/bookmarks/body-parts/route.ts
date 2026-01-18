import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ==========================================
// 1. 부위 북마크 목록 조회 (GET)
// ==========================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 북마크 정보와 연결된 부위(BodyPart) 정보를 Join해서 가져옴
    const bookmarks = await prisma.bookmarkBodyPart.findMany({
      where: { user: { email: session.user.email } },
      include: {
        bodyPart: true, // Prisma Relation 연결
      },
      orderBy: { createdAt: 'desc' },
    });

    // 명세서 구조대로 매핑
    const formattedData = bookmarks.map((b) => ({
      bookmark_id: b.id,
      created_at: b.createdAt,
      body_part: {
        id: b.bodyPart.id,
        name_ko: b.bodyPart.nameKo,
        name_en: b.bodyPart.nameEn,
        systemId: b.bodyPart.systemId,
      },
    }));

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });

  } catch (error) {
    console.error("GET /bookmarks/body-parts Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// ==========================================
// 2. 부위 북마크 추가 (POST)
// ==========================================
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 입력값 검증 (body_part_id는 숫자여야 함)
    const schema = z.object({
      body_part_id: z.number(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { body_part_id } = validation.data;

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 중복 체크
    const existing = await prisma.bookmarkBodyPart.findFirst({
      where: {
        userId: user.id,
        bodyPartId: body_part_id,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already bookmarked" }, { status: 409 });
    }

    // 존재하지 않는 부위 ID인지 확인 (옵션)
    const bodyPartExists = await prisma.bodyPart.findUnique({
        where: { id: body_part_id }
    });
    if (!bodyPartExists) {
        return NextResponse.json({ error: "Body part not found" }, { status: 404 });
    }

    // DB 저장
    const newBookmark = await prisma.bookmarkBodyPart.create({
      data: {
        userId: user.id,
        bodyPartId: body_part_id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newBookmark.id, // 생성된 북마크 PK
        body_part_id: newBookmark.bodyPartId,
        created_at: newBookmark.createdAt,
      },
    });

  } catch (error) {
    console.error("POST /bookmarks/body-parts Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}