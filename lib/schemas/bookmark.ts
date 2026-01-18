import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// ==========================================
// 1. 공통 스키마 정의 (데이터 모양)
// ==========================================

// 1-1. 신체 부위 (BodyPart)
const BodyPartSchema = z.object({
  id: z.number().openapi({ example: 101 }),
  name_ko: z.string().openapi({ example: '심장' }),
  name_en: z.string().openapi({ example: 'Heart' }),
  system_code: z.string().openapi({ example: 'CARDIO' }),
});

// 1-2. 신체 부위 북마크 (목록 조회용)
const BodyPartBookmarkSchema = z.object({
  bookmark_id: z.number().openapi({ example: 15 }),
  created_at: z.string().datetime().openapi({ example: '2026-01-17T14:30:00Z' }),
  body_part: BodyPartSchema,
});

// 1-3. 병원 북마크 (목록 조회용)
const HospitalBookmarkSchema = z.object({
  bookmark_id: z.number().openapi({ example: 55 }),
  place_id: z.string().openapi({ example: 'ChIJ...' }),
  name: z.string().openapi({ example: '서울대학교병원' }),
  address: z.string().nullable().openapi({ example: '서울특별시 종로구 대학로 101' }),
  created_at: z.string().datetime().openapi({ example: '2026-01-17T15:00:00Z' }),
});

// ==========================================
// 2. API 경로 등록
// ==========================================

// ------------------------------------------
// [A] 신체 부위 북마크 API
// ------------------------------------------

// 1) 목록 조회 (GET)
registry.registerPath({
  method: 'get',
  path: '/users/me/bookmarks/body-parts',
  summary: '부위 북마크 목록',
  tags: ['Bookmark'],
  responses: {
    200: {
      description: '조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            count: z.number().openapi({ example: 1 }),
            data: z.array(BodyPartBookmarkSchema),
          }),
        },
      },
    },
    401: { description: '로그인 필요' },
  },
});

// 2) 추가 (POST)
registry.registerPath({
  method: 'post',
  path: '/users/me/bookmarks/body-parts',
  summary: '부위 북마크 추가',
  tags: ['Bookmark'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            body_part_id: z.number().openapi({ example: 101 }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '추가 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: z.object({
              id: z.number().openapi({ example: 15, description: '생성된 북마크 PK' }),
              body_part_id: z.number().openapi({ example: 101 }),
              created_at: z.string().datetime().openapi({ example: '2026-01-17T14:30:00Z' }),
            }),
          }),
        },
      },
    },
    409: { description: '이미 북마크된 부위' },
  },
});

// 3) 삭제 (DELETE)
registry.registerPath({
  method: 'delete',
  path: '/users/me/bookmarks/body-parts/{id}',
  summary: '부위 북마크 삭제',
  tags: ['Bookmark'],
  request: {
    params: z.object({
      id: z.string().openapi({ example: '15', description: '북마크 테이블의 PK' }),
    }),
  },
  responses: {
    200: {
      description: '삭제 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: '북마크가 삭제되었습니다.' }),
          }),
        },
      },
    },
    404: { description: '북마크를 찾을 수 없음' },
  },
});


// ------------------------------------------
// [B] 병원 북마크 API
// ------------------------------------------

// 4) 목록 조회 (GET)
registry.registerPath({
  method: 'get',
  path: '/users/me/bookmarks/hospital',
  summary: '병원 북마크 목록',
  tags: ['Bookmark'],
  responses: {
    200: {
      description: '조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            count: z.number().openapi({ example: 5 }),
            data: z.array(HospitalBookmarkSchema),
          }),
        },
      },
    },
  },
});

// 5) 추가 (POST)
registry.registerPath({
  method: 'post',
  path: '/users/me/bookmarks/hospital',
  summary: '병원 북마크 추가',
  tags: ['Bookmark'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            place_id: z.string().openapi({ example: 'ChIJu...', description: '구글/카카오 지도 Place ID' }),
            name: z.string().openapi({ example: '서울대학교병원' }),
            address: z.string().optional().openapi({ example: '서울특별시 종로구 대학로 101' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '추가 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: z.object({
              id: z.number().openapi({ example: 55, description: '생성된 북마크 PK' }),
              place_id: z.string().openapi({ example: 'ChIJu...' }),
              created_at: z.string().datetime().openapi({ example: '2026-01-17T15:00:00Z' }),
            }),
          }),
        },
      },
    },
    409: { description: '이미 북마크된 병원' },
  },
});

// 6) 삭제 (DELETE)
registry.registerPath({
  method: 'delete',
  path: '/users/me/bookmarks/hospital/{id}',
  summary: '병원 북마크 삭제',
  tags: ['Bookmark'],
  request: {
    params: z.object({
      id: z.string().openapi({ example: '55', description: '북마크 테이블의 PK' }),
    }),
  },
  responses: {
    200: {
      description: '삭제 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: '북마크가 삭제되었습니다.' }),
          }),
        },
      },
    },
    404: { description: '북마크를 찾을 수 없음' },
  },
});