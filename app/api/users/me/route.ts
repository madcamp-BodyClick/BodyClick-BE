import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { prisma } from "@/lib/prisma";

// ==========================================
// 공통: Prisma 데이터를 API 응답 포맷(snake_case)으로 변환하는 함수
// ==========================================
function mapUserResponse(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    // Date 객체를 YYYY-MM-DD 문자열로 변환
    birth_date: user.birthDate ? user.birthDate.toISOString().split('T')[0] : null,
    gender: user.gender,
    created_at: user.createdAt,
  };
}

// ==========================================
// 1. 프로필 조회 (GET)
// ==========================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Swagger 정의대로 success: true와 data 구조로 감싸서 반환
    return NextResponse.json({
      success: true,
      data: mapUserResponse(user),
    });

  } catch (error) {
    console.error("GET /users/me Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ==========================================
// 2. 프로필 수정 (PATCH)
// ==========================================
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // 요청은 snake_case로 들어오지만, Prisma(DB) 업데이트는 camelCase로 해야 함
    const { name, birth_date, gender } = body;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name,
        // 문자열("1990-01-01")을 Date 객체로 변환
        birthDate: birth_date ? new Date(birth_date) : undefined,
        gender,
      },
    });

    return NextResponse.json({
      success: true,
      data: mapUserResponse(updatedUser),
    });

  } catch (error) {
    console.error("PATCH /users/me Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// ==========================================
// 3. 회원 탈퇴 (DELETE)
// ==========================================
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    console.log("🔍 현재 세션 상태:", JSON.stringify(session, null, 2));
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.delete({
      where: { email: session.user.email },
    });

    return NextResponse.json({
      success: true,
      message: "회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.",
    });

  } catch (error) {
    console.error("DELETE /users/me Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}