import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/swagger';

extendZodWithOpenApi(z);

// ==========================================
// 1. 질환 데이터 스키마 (DiseaseSchema)
// ==========================================
const DiseaseSchema = z.object({
  id: z.number().openapi({ example: 501 }),
  body_part_id: z.number().openapi({ example: 101 }),
  name: z.string().openapi({ example: '협심증' }),
  description: z.string().openapi({ example: '심장에 혈액을 공급하는 관상동맥이 좁아져서 생기는 질환' }),
  common_symptoms: z.string().openapi({ example: '가슴을 쥐어짜는 듯한 통증, 호흡곤란' }),
  severity_level: z.number().min(1).max(5).openapi({ example: 4, description: '1~5 (UI에서 별점이나 색상으로 표현)' }),
  requires_medical_attention: z.boolean().openapi({ example: true, description: '즉시 병원 방문 필' }),
});

// ==========================================
// 2. API 경로 등록
// ==========================================

// 대표 질환 상세 정보 조회 (GET /diseases/{id})
registry.registerPath({
  method: 'get',
  path: '/diseases/{id}',
  summary: '대표 질환 정보 조회',
  description: '특정 질환의 상세 정보를 조회합니다.',
  tags: ['Disease'], // 새로운 태그 추가
  request: {
    params: z.object({
      id: z.string().openapi({ example: '501', description: '질환 ID' }),
    }),
  },
  responses: {
    200: {
      description: '조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: DiseaseSchema,
          }),
        },
      },
    },
    404: { description: '질환 정보를 찾을 수 없음' },
  },
});