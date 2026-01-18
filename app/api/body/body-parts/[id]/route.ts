import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, message: '유효하지 않은 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    const bodyPart = await prisma.bodyPart.findUnique({
      where: { id },
    });

    if (!bodyPart) {
      return NextResponse.json(
        { success: false, message: '해당 부위를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bodyPart, // key_roles, observation_points 등 포함
    });
  } catch (error) {
    console.error('Error fetching body part detail:', error);
    return NextResponse.json(
      { success: false, message: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}