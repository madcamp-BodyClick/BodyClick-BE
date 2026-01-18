import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 로그인 세션 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. ID 유효성 검사
    const bookmarkId = parseInt(params.id);
    if (isNaN(bookmarkId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // 3. 삭제 수행 (내 북마크인지 확인 + 삭제)
    const result = await prisma.bookmarkBodyPart.deleteMany({
      where: {
        id: bookmarkId,
        user: { email: session.user.email }, // 소유권 확인
      },
    });

    // 4. 결과 처리
    if (result.count === 0) {
      return NextResponse.json({ error: "Bookmark not found or permission denied" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "북마크가 삭제되었습니다.",
    });

  } catch (error) {
    console.error("DELETE /bookmarks/body-parts/[id] Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}