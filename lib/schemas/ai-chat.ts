import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// ==========================================
// 1. AI에게 질문 (POST /ai-chats/queries)
// 설명: 사용자의 질문을 받고, 답변과 함께 업데이트된 요약 정보를 반환합니다.
// ==========================================

// [Request]
export const CreateQuerySchema = z.object({
  body_part_id: z.number().openapi({
    example: 101,
    description: '질문과 관련된 신체 부위 ID'
  }),
  question: z.string().openapi({
    example: "열도 좀 나는 것 같아. 위험한 거야?",
    description: '사용자의 질문 내용'
  }),
  // 👇 핑퐁 로직을 위한 핵심 필드 (선택 사항)
  previous_summary: z.string().optional().nullable().openapi({
    example: "환자는 가끔 심장 부위가 콕콕 찌르는 듯한 흉통을 호소함.",
    description: '직전 턴까지의 상담 요약 (문맥 유지를 위해 프론트에서 전송)'
  }),
});

// [Response]
export const QueryResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: z.object({
    id: z.number().openapi({ example: 12346 }),
    answer: z.string().openapi({
      example: "흉통과 함께 발열이 동반된다면 염증성 질환일 수 있어 주의가 필요합니다."
    }),
    confidence_score: z.number().openapi({ example: 0.88 }),
    created_at: z.string().datetime().openapi({ example: "2026-01-17T14:21:00Z" }),
    
    // 👇 프론트엔드가 '임시 저장'할 최신 상태 정보
    medical_context: z.object({
      summary: z.string().openapi({ 
        example: "환자는 심장 부위의 콕콕 찌르는 흉통과 함께 발열 증상을 추가로 호소함." 
      }),
      risk_level: z.number().min(1).max(5).openapi({ example: 3 }),
    }).openapi({ description: '이번 문답을 통해 갱신된 요약 정보' }),
  }),
});

// [Registry]
registry.registerPath({
  method: 'post',
  path: '/ai-chats/queries',
  summary: 'AI에게 질문하기',
  description: '질문을 보내고 AI의 답변과 갱신된 상담 요약을 받습니다.',
  tags: ['AI-Chat'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateQuerySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '성공',
      content: {
        'application/json': {
          schema: QueryResponseSchema,
        },
      },
    },
  },
});


// ==========================================
// 2. 상담 결과 저장 (POST /ai-chats/medical-context)
// 설명: 상담 종료 시, 최종 요약본을 DB에 영구 저장합니다.
// ==========================================

// [Request]
export const SaveMedicalContextSchema = z.object({
  user_id: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: '로그인한 사용자 ID'
  }),
  agent_id: z.number().openapi({
    example: 1,
    description: '상담을 진행한 AI Agent ID'
  }),
  summary: z.string().openapi({
    example: "환자는 3일 전부터 두통을 호소하였으며...",
    description: '최종 확정된 상담 요약'
  }),
  risk_level: z.number().int().min(1).max(5).openapi({
    example: 3,
    description: '최종 판단된 위험도 (1~5)'
  }),
});

// [Response]
export const SaveMedicalContextResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: z.object({
    id: z.number().openapi({ 
      example: 15,
      description: '생성된 히스토리 ID (UserMedicalContext PK)'
    }),
    created_at: z.string().datetime().openapi({ example: "2026-01-20T12:00:00Z" }),
  }),
});

// [Registry]
registry.registerPath({
  method: 'post',
  path: '/ai-chats/medical-context',
  summary: '상담 결과 저장',
  description: '상담 종료 버튼 클릭 시 호출하여 최종 결과를 저장합니다.',
  tags: ['AI-Chat'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SaveMedicalContextSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '저장 성공',
      content: {
        'application/json': {
          schema: SaveMedicalContextResponseSchema,
        },
      },
    },
  },
});


// ==========================================
// 3. 상담 내용 초기화 (DELETE /ai-chats/context)
// 설명: 클라이언트나 서버의 임시 기억을 초기화합니다. (선택적 구현)
// ==========================================

// [Response]
export const ResetContextResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: "상담 기억이 초기화되었습니다. 새로운 주제로 대화를 시작합니다." }),
});

// [Registry]
registry.registerPath({
  method: 'delete',
  path: '/ai-chats/context',
  summary: '상담 내용 초기화',
  description: '새로운 주제로 대화를 시작하기 위해 이전 문맥을 지웁니다.',
  tags: ['AI-Chat'],
  responses: {
    200: {
      description: '초기화 성공',
      content: {
        'application/json': {
          schema: ResetContextResponseSchema,
        },
      },
    },
  },
});