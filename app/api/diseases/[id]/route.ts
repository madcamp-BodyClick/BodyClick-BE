import { NextRequest, NextResponse } from "next/server"; // Request 대신 NextRequest 사용 권장
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  // [수정 1] params의 타입을 Promise로 변경해야 합니다.
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // [수정 2] 비동기 params를 await로 먼저 풀어줘야 id에 접근 가능합니다.
    const { id } = await params;

    // 1. ID 유효성 검사 (추출한 id 사용)
    const diseaseId = parseInt(id);
    if (isNaN(diseaseId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // 2. DB 조회 (로그인 체크 없이 공개 정보로 제공)
    const disease = await prisma.disease.findUnique({
      where: { id: diseaseId },
    });

    // 3. 데이터가 없을 경우 처리
    if (!disease) {
      return NextResponse.json({ error: "Disease not found" }, { status: 404 });
    }

    // 4. 응답 반환 (snake_case로 변환)
    return NextResponse.json({
      success: true,
      data: {
        id: disease.id,
        body_part_id: disease.bodyPartId,
        name: disease.name,
        description: disease.description,
        common_symptoms: disease.commonSymptoms,
        severity_level: disease.severityLevel,
        requires_medical_attention: disease.requiresMedicalAttention,
      },
    });

  } catch (error) {
    console.error("GET /diseases/[id] Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}