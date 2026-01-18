// lib/swagger.ts
import { createDocument } from 'zod-openapi'; // 또는 extendZodWithOpenApi 사용
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// 1. 레지스트리 초기화 (여기에 모든 스키마와 경로를 등록할 것입니다)
export const registry = new OpenAPIRegistry();

// 2. Bearer Auth 등록 (선택 사항)
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// 3. OpenAPI 문서 생성 함수
export function getOpenApiDocumentation() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Next.js Zod-OpenAPI Project',
      description: 'Zod 스키마를 기반으로 자동 생성된 API 명세서입니다.',
    },
    servers: [{ url: 'http://localhost:3000/api' }],
  });
}