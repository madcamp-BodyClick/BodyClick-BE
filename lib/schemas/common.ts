import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// ==========================================
// 1. 공통 스키마 정의
// ==========================================

// 1-1. 인기 신체 부위 아이템
const PopularBodyPartSchema = z.object({
  id: z.number().openapi({ example: 101 }),
  name: z.string().openapi({ example: '심장' }),
  system_name: z.string().openapi({ example: '심혈관계' }),
  view_count: z.number().openapi({ example: 15420 }),
});

// 1-2. 검색/조회 기록 아이템 (GET 조회용)
const HistoryItemSchema = z.object({
  history_id: z.number().openapi({ example: 14 }),
  type: z.enum(['view', 'keyword']).openapi({ example: 'view', description: 'view(상세조회) 또는 keyword(단순검색)' }),
  keyword: z.string().openapi({ example: '심장' }),
  body_part_id: z.number().nullable().openapi({ example: 101, description: '클릭 시 바로 이동 가능한 ID (keyword 타입이면 null)' }),
  searched_at: z.string().datetime().openapi({ example: '2026-01-18T21:30:00Z' }),
});

// 1-3. 통합 검색 결과 아이템
const SearchResultSchema = z.object({
  id: z.number().openapi({ example: 101 }),
  name: z.string().openapi({ example: '심장' }),
  system_name: z.string().openapi({ example: '심혈관계' }),
});

// 👇 [추가] 1-4. 기록 저장 요청 스키마 (POST Request Body)
const SaveHistoryRequestSchema = z.object({
  body_part_id: z.number().openapi({ example: 101, description: '조회한 신체 부위 ID' }),
});

// 👇 [추가] 1-5. 기록 저장 응답 스키마 (POST Response Body)
const SaveHistoryResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  data: z.object({
    id: z.number().openapi({ example: 5678 }),
    user_id: z.string().openapi({ example: 'uuid-user-1234', description: '확인용 유저 ID' }),
    body_part_id: z.number().openapi({ example: 101 }),
    created_at: z.string().datetime().openapi({ example: '2026-01-21T15:30:00Z' }),
  }),
});

// ==========================================
// 2. API 경로 등록
// ==========================================

// 2-1. 검색 홈 (인기 + 최근)
registry.registerPath({
  method: 'get',
  path: '/common/search/home',
  summary: '검색 홈 (인기/최근 기록)',
  description: '검색 화면 진입 시 보여줄 인기 부위 목록과 나의 최근 기록을 조회합니다.',
  tags: ['Search'],
  responses: {
    200: {
      description: '조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: z.object({
              popular_body_parts: z.array(PopularBodyPartSchema),
              my_recent_history: z.array(HistoryItemSchema).optional().openapi({ description: '로그인 유저일 경우에만 포함' }),
            }),
          }),
        },
      },
    },
  },
});

// 2-2. 통합 검색 (키워드)
registry.registerPath({
  method: 'get',
  path: '/common/search',
  summary: '통합 검색',
  description: '키워드로 신체 부위를 검색합니다 (자동완성 및 결과 용도).',
  tags: ['Search'],
  request: {
    query: z.object({
      keyword: z.string().openapi({ example: '심', description: '검색어' }),
    }),
  },
  responses: {
    200: {
      description: '검색 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: z.array(SearchResultSchema),
          }),
        },
      },
    },
    400: { description: '키워드 누락' },
  },
});

// 👇 [추가] 2-3. 부위 조회 기록 저장 (POST)
registry.registerPath({
  method: 'post',
  path: '/common/history',
  summary: '부위 조회 기록 저장',
  description: '사용자가 특정 신체 부위를 클릭했을 때 조회 기록을 저장합니다. (로그인 필요)',
  tags: ['Search'], 
  // 🔒 Header: Authorization: Bearer <accessToken> 자동 반영
  security: [{ bearerAuth: [] }], 
  request: {
    body: {
      content: {
        'application/json': {
          schema: SaveHistoryRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '저장 성공',
      content: {
        'application/json': {
          schema: SaveHistoryResponseSchema,
        },
      },
    },
    400: { description: '잘못된 입력 (body_part_id 누락 등)' },
    401: { description: '인증 실패 (로그인 필요)' },
  },
});

export const saveHistorySchema = z.object({
  body_part_id: z.number().int().positive("유효하지 않은 부위 ID입니다."),
});