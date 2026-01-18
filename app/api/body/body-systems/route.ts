import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // prisma 클라이언트 경로 확인

export async function GET() {
  try {
    const systems = await prisma.bodySystem.findMany({
      orderBy: { id: 'asc' }, // ID 순 정렬
    });

    return NextResponse.json({
      success: true,
      count: systems.length,
      data: systems,
    });
  } catch (error) {
    console.error('Error fetching body systems:', error);
    return NextResponse.json(
      { success: false, message: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}