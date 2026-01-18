import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ==========================================
// 1. 병원 북마크 목록 조회 (GET)
// ==========================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookmarks = await prisma.bookmarkHospital.findMany({
      where: { user: { email: session.user.email } },
      orderBy: { createdAt: 'desc' }, // 최신순 정렬
    });

    // 명세서에 맞춰 camelCase(DB) -> snake_case(API) 변환
    const formattedData = bookmarks.map((b) => ({
      bookmark_id: b.id,
      place_id: b.placeId,
      name: b.name,
      address: b.address,
      created_at: b.createdAt,
    }));

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });

  } catch (error) {
    console.error("GET /bookmarks/hospital Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// ==========================================
// 2. 병원 북마크 추가 (POST)
// ==========================================
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 입력값 검증 (zod)
    const schema = z.object({
      place_id: z.string().min(1),
      name: z.string().min(1),
      address: z.string().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { place_id, name, address } = validation.data;

    // 사용자 조회 (id 확보용)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 중복 북마크 확인
    const existing = await prisma.bookmarkHospital.findFirst({
      where: {
        userId: user.id,
        placeId: place_id,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already bookmarked" }, { status: 409 });
    }

    // DB 저장
    const newBookmark = await prisma.bookmarkHospital.create({
      data: {
        userId: user.id,
        placeId: place_id,
        name: name,
        address: address,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newBookmark.id, // 생성된 북마크 PK
        place_id: newBookmark.placeId,
        created_at: newBookmark.createdAt,
      },
    });

  } catch (error) {
    console.error("POST /bookmarks/hospital Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}