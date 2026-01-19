import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  // [수정 1] params의 타입을 Promise로 정의해야 합니다.
  { params }: { params: Promise<{ id: string }> }
) {
  // [수정 2] 비동기 params를 await로 풀어서 id를 꺼내야 합니다.
  const { id } = await params;
  
  const bodyPartId = Number(id);

  if (isNaN(bodyPartId)) {
    return NextResponse.json(
      { success: false, message: '유효하지 않은 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    // Disease 모델이 BodyPart와 관계가 맺어져 있다고 가정
    const diseases = await prisma.disease.findMany({
      where: {
        bodyPartId: bodyPartId, 
        // 만약 다대다 관계(M:N)라면 아래와 같이 작성:
        // relatedParts: { some: { id: bodyPartId } }
      },
      select: {
        id: true,
        name: true,
        severityLevel: true,
        commonSymptoms: true,
        requiresMedicalAttention: true,
      },
      orderBy: { severityLevel: 'desc' }, // 위험도 순 정렬 예시
    });

    return NextResponse.json({
      success: true,
      count: diseases.length,
      data: diseases,
    });
  } catch (error) {
    console.error('Error fetching diseases:', error);
    return NextResponse.json(
      { success: false, message: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );  
  }
}