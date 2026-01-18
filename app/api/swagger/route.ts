// app/api/swagger/route.ts
import { getOpenApiDocumentation } from '@/lib/swagger';
import { NextResponse } from 'next/server';

// 여기서 스키마 파일들을 import 해줘야 레지스트리에 등록이 됩니다.
// (프로젝트가 커지면 index.ts 등으로 묶어서 관리 권장)
import '@/lib/schemas/user'; 

export async function GET() {
  const spec = getOpenApiDocumentation();
  return NextResponse.json(spec);
}