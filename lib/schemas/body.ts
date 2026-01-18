import { z } from 'zod';
import { registry } from '@/lib/swagger'; // registry 인스턴스가 위치한 경로

// ----------------------------------------------------------------------
// 1. Zod Schemas (데이터 모델 정의)
// ----------------------------------------------------------------------

/** 공통 응답 스키마 생성기 */
const createResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean().openapi({ example: true }),
    count: z.number().optional().openapi({ example: 10 }),
    data: dataSchema,
  });

/** 신체 계통 (Body System) */
export const BodySystemSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  code: z.string().openapi({ example: 'MUSCULO' }),
  name_ko: z.string().openapi({ example: '근골격계' }),
  name_en: z.string().openapi({ example: 'Musculoskeletal System' }),
  description: z.string().optional().openapi({ example: '근육, 뼈, 연골 등...' }),
});

/** 신체 부위 (Body Part) - 리스트/상세 공통 */
export const BodyPartSchema = z.object({
  id: z.number().openapi({ example: 101 }),
  name_ko: z.string().openapi({ example: '심장' }),
  name_en: z.string().openapi({ example: 'Heart' }),
  description: z.string().optional().openapi({ example: '전신 혈액 순환을 담당...' }),
  // 상세 조회 시에만 포함될 수 있는 필드들은 optional 처리
  key_roles: z.array(z.string()).optional().openapi({ example: ['혈액 펌핑', '산소 공급'] }),
  observation_points: z.array(z.string()).optional().openapi({ example: ['불규칙한 박동'] }),
  view_camera: z.object({
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
  }).optional().openapi({ example: { position: { x: 0, y: 1.5, z: 0 } } }),
});

/** 질환 (Disease) */
export const DiseaseSchema = z.object({
  id: z.number().openapi({ example: 501 }),
  name: z.string().openapi({ example: '협심증' }),
  severity_level: z.number().min(1).max(5).openapi({ example: 4, description: '1~5 위험도' }),
  common_symptoms: z.string().openapi({ example: '가슴을 쥐어짜는 통증' }),
  requires_medical_attention: z.boolean().openapi({ example: true }),
});

// ----------------------------------------------------------------------
// 2. Register Paths (Swagger 문서에 경로 등록)
// ----------------------------------------------------------------------

// 1. 계통 조회 (GET /api/body/body-systems)
registry.registerPath({
  method: 'get',
  path: '/api/body/body-systems',
  tags: ['Body'],
  summary: '전체 신체 계통 조회',
  responses: {
    200: {
      description: '성공',
      content: {
        'application/json': {
          schema: createResponseSchema(z.array(BodySystemSchema)),
        },
      },
    },
  },
});

// 2. 신체 부위 목록 조회 (GET /api/body/body-parts)
registry.registerPath({
  method: 'get',
  path: '/api/body/body-parts',
  tags: ['Body'],
  summary: '신체 부위 목록 조회 (전체 또는 특정 계통)',
  request: {
    query: z.object({
      system_id: z.string().optional().openapi({ example: '2', description: '특정 계통 ID로 필터링' }),
    }),
  },
  responses: {
    200: {
      description: '성공',
      content: {
        'application/json': {
          schema: createResponseSchema(z.array(BodyPartSchema)),
        },
      },
    },
  },
});

// 3. 특정 부위 상세 조회 (GET /api/body/body-parts/{id})
registry.registerPath({
  method: 'get',
  path: '/api/body/body-parts/{id}',
  tags: ['Body'],
  summary: '특정 신체 부위 상세 정보 조회',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '101', description: '부위 ID' }),
    }),
  },
  responses: {
    200: {
      description: '성공',
      content: {
        'application/json': {
          schema: createResponseSchema(BodyPartSchema),
        },
      },
    },
    404: {
      description: '부위를 찾을 수 없음',
    },
  },
});

// 4. 부위별 대표 질환 조회 (GET /api/body/body-parts/{id}/diseases)
registry.registerPath({
  method: 'get',
  path: '/api/body/body-parts/{id}/diseases',
  tags: ['Body'],
  summary: '특정 부위의 대표 질환 목록 조회',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '101', description: '부위 ID' }),
    }),
  },
  responses: {
    200: {
      description: '성공',
      content: {
        'application/json': {
          schema: createResponseSchema(z.array(DiseaseSchema)),
        },
      },
    },
  },
});