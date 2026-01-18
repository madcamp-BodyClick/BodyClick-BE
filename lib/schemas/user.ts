import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// ==========================================
// 1. 기본 유저 데이터 스키마 (UserSchema)
// ==========================================
export const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: 'f48ce028-28f3...' }),
  email: z.string().email().openapi({ example: 'medical@test.com' }),
  name: z.string().nullable().openapi({ example: '홍길동' }),
  image: z.string().url().nullable().openapi({ example: 'https://lh3.google...' }),
  // 스크린샷에 맞춰 snake_case로 정의
  birth_date: z.string().nullable().openapi({ example: '2000-01-01', description: 'YYYY-MM-DD' }), 
  gender: z.enum(['MALE', 'FEMALE']).nullable().openapi({ example: 'MALE' }),
  created_at: z.string().datetime().openapi({ example: '2026-01-17T10:00:00Z' }),
}).openapi('User');

// ==========================================
// 2. 응답 껍데기(Wrapper) 스키마 정의
// ==========================================

// 성공 시 데이터 반환용 (GET, PATCH)
const UserSuccessResponse = z.object({
  success: z.boolean().openapi({ example: true }),
  data: UserSchema,
}).openapi('UserSuccessResponse');

// 성공 시 메시지 반환용 (DELETE)
const MessageResponse = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: '작업이 완료되었습니다.' }),
}).openapi('MessageResponse');


// ==========================================
// 3. API 경로 등록 (Registry)
// ==========================================

// 1) 프로필 조회 (GET /users/me)
registry.registerPath({
  method: 'get',
  path: '/users/me',
  summary: '내 프로필 조회',
  tags: ['User'],
  responses: {
    200: {
      description: '성공',
      content: {
        'application/json': { schema: UserSuccessResponse }, // Wrapper 사용
      },
    },
    401: { description: '로그인 필요' },
  },
});

// 2) 프로필 수정 (PATCH /users/me)
registry.registerPath({
  method: 'patch',
  path: '/users/me',
  summary: '내 프로필 수정',
  tags: ['User'],
  request: {
    body: {
      content: {
        'application/json': {
          // 수정 요청 시 보낼 데이터 정의 (id, email 등은 제외)
          schema: z.object({
            name: z.string().optional().openapi({ example: '김철수' }),
            birth_date: z.string().optional().openapi({ example: '1998-12-25' }),
            gender: z.enum(['MALE', 'FEMALE']).optional().openapi({ example: 'MALE' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '수정 성공',
      content: {
        'application/json': { schema: UserSuccessResponse }, // Wrapper 사용
      },
    },
  },
});

// 3) 회원 탈퇴 (DELETE /users/me)
registry.registerPath({
  method: 'delete',
  path: '/users/me',
  summary: '회원 탈퇴',
  tags: ['User'],
  responses: {
    200: {
      description: '탈퇴 성공',
      content: {
        'application/json': { schema: MessageResponse }, // 메시지 전용 Wrapper 사용
      },
    },
  },
});