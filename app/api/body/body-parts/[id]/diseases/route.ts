import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bodyPartId = Number(params.id);

  if (isNaN(bodyPartId)) {
    return NextResponse.json(
      { success: false, message: '유효하지 않은 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    // Disease 모델이 BodyPart와 관계가 맺어져 있다고 가정
    // 예: Disease 모델에 bodyPartId가 있거나, 다대다 관계일 경우
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