import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. ID 유효성 검사
    const diseaseId = parseInt(params.id);
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