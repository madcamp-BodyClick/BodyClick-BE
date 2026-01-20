import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // prisma 인스턴스 경로 (프로젝트 설정에 맞게 수정)

export async function POST(request: Request) {
  try {
    // 1. Request Body 파싱
    // 명세서에 있는 snake_case 변수명 그대로 구조 분해 할당
    const body = await request.json();
    const { user_id, agent_id, summary, risk_level } = body;

    // 2. 유효성 검사 (필수 데이터 확인)
    if (!user_id || !agent_id || !summary || !risk_level) {
      return NextResponse.json(
        { success: false, error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 3. DB 저장 (Prisma)
    // user_medical_contexts 테이블에 저장합니다.
    const savedContext = await prisma.userMedicalContext.create({
      data: {
        userId: user_id,         // [API] user_id -> [DB] userId
        agentId: agent_id,       // [API] agent_id -> [DB] agentId
        summary: summary,        // [API] summary -> [DB] summary
        riskLevel: risk_level,   // [API] risk_level -> [DB] riskLevel
        
        // consultedAt(상담일시)은 DB 스키마에서 @default(now())로 설정되어 있어 자동 생성됩니다.
      },
    });

    // 4. 응답 반환 (API 명세서 Response 형식 준수)
    return NextResponse.json({
      success: true,
      data: {
        id: savedContext.id,                 // 생성된 히스토리 ID
        created_at: savedContext.consultedAt // DB의 last_consulted_at
      },
    });

  } catch (error) {
    console.error("Medical Context 저장 실패:", error);
    
    // 외래키 제약 조건 에러 (존재하지 않는 user_id나 agent_id일 경우) 처리
    return NextResponse.json(
      { success: false, error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}