// lib/schemas/user.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger'; // 위에서 만든 레지스트리

// Zod에 OpenAPI 기능을 확장합니다 (앱 실행 시 한 번만 호출되면 됨)
extendZodWithOpenApi(z);

// 1. Zod 스키마 정의 + OpenAPI 메타데이터
export const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  username: z.string().min(3).openapi({ example: 'cs_major', description: '사용자 ID' }),
  age: z.number().int().openapi({ example: 24 }),
}).openapi('User'); // 'User'라는 이름으로 Component에 등록됨

// 2. API 경로(Path) 정의
// 실제 라우트 핸들러가 아니라 "문서상의 정의"입니다.
registry.registerPath({
  method: 'post',
  path: '/users',
  description: '새로운 유저를 생성합니다.',
  summary: '유저 생성 API',
  tags: ['User'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UserSchema.omit({ id: true }), // id는 서버 생성이라 제외
        },
      },
    },
  },
  responses: {
    200: {
      description: '유저 생성 성공',
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
    },
  },
});