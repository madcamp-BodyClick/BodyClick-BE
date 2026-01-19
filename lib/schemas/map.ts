import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// ==========================================
// 1. 스키마 정의
// ==========================================

const PlaceLocationSchema = z.object({
  lat: z.number().openapi({ example: 37.5796 }),
  lng: z.number().openapi({ example: 126.9990 }),
});

const PlaceSchema = z.object({
  place_id: z.string().openapi({ example: "12345678", description: "카카오 장소 ID" }),
  name: z.string().openapi({ example: "서울대학교병원" }),
  address: z.string().openapi({ example: "서울특별시 종로구 대학로 101" }),
  road_address: z.string().optional().openapi({ example: "서울특별시 종로구 연건동 28" }),
  location: PlaceLocationSchema,
  phone_number: z.string().nullable().openapi({ example: "02-2072-2114" }),
  
  // 카카오 미지원 필드는 nullable 또는 0으로 표기
  rating: z.number().optional().openapi({ example: 0, description: "카카오 API 미지원 (항상 0)" }),
  user_ratings_total: z.number().optional().openapi({ example: 0, description: "카카오 API 미지원 (항상 0)" }),
  is_open_now: z.boolean().nullable().optional().openapi({ example: null, description: "카카오 API 미지원" }),
});

// ==========================================
// 2. API 경로 등록
// ==========================================

registry.registerPath({
  method: 'get',
  path: '/maps/places',
  summary: '병원(장소) 검색',
  description: '위치 기반으로 키워드를 검색하여 장소 목록을 반환합니다.',
  tags: ['Map'],
  request: {
    query: z.object({
      lat: z.string().openapi({ example: "37.5665", description: "중심 위도" }),
      lng: z.string().openapi({ example: "126.9780", description: "중심 경도" }),
      keyword: z.string().openapi({ example: "정형외과", description: "검색 키워드" }),
      radius: z.string().optional().openapi({ example: "2000", description: "반경(m), 기본값 2000" }),
    }),
  },
  responses: {
    200: {
      description: '검색 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            count: z.number().openapi({ example: 5 }),
            data: z.array(PlaceSchema),
          }),
        },
      },
    },
    400: { description: '필수 파라미터 누락' },
    401: { description: '인증 실패' },
  },
});