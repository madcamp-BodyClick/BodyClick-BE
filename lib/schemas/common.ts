import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// ==========================================
// 1. 공통 스키마 정의
// ==========================================

// 인기 신체 부위 아이템
const PopularBodyPartSchema = z.object({
  id: z.number().openapi({ example: 101 }),
  name: z.string().openapi({ example: '심장' }),
  system_name: z.string().openapi({ example: '심혈관계' }),
  view_count: z.number().openapi({ example: 15420 }),
});

// 검색/조회 기록 아이템
const HistoryItemSchema = z.object({
  history_id: z.number().openapi({ example: 14 }),
  type: z.enum(['view', 'keyword']).openapi({ example: 'view', description: 'view(상세조회) 또는 keyword(단순검색)' }),
  keyword: z.string().openapi({ example: '심장' }),
  body_part_id: z.number().nullable().openapi({ example: 101, description: '클릭 시 바로 이동 가능한 ID (keyword 타입이면 null)' }),
  searched_at: z.string().datetime().openapi({ example: '2026-01-18T21:30:00Z' }),
});

// 통합 검색 결과 아이템
const SearchResultSchema = z.object({
  id: z.number().openapi({ example: 101 }),
  name: z.string().openapi({ example: '심장' }),
  system_name: z.string().openapi({ example: '심혈관계' }),
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
  tags: ['Search'], // 새로운 태그
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