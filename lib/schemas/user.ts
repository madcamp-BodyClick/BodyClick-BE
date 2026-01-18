import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// 1. Prisma 모델 및 구글 프로필에 맞게 스키마 수정
export const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: 'uuid-string-123' }),
  name: z.string().openapi({ example: '홍길동', description: '구글 계정 이름' }),
  email: z.string().email().openapi({ example: 'user@gmail.com' }),
  image: z.string().url().nullable().openapi({ example: 'https://lh3.googleusercontent.com/...' }),
}).openapi('User');

// 2. 삭제된 POST /users 등록 코드 제거 및 세션 확인 API로 대체
// 기존의 registry.registerPath({ method: 'post', path: '/users', ... }) 부분은 삭제하세요.

registry.registerPath({
  method: 'get',
  path: '/api/auth/session',
  description: '현재 로그인된 유저의 세션 정보를 가져옵니다.',
  summary: '세션 정보 조회 (구글 로그인 상태 확인)',
  tags: ['Auth'],
  responses: {
    200: {
      description: '세션 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            user: UserSchema,
            expires: z.string(),
          }),
        },
      },
    },
  },
});