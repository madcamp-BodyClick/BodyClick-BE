import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ .env 파일에 GEMINI_API_KEY가 반드시 설정되어 있어야 합니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

const prisma = new PrismaClient();

// 👇 [설정] 데이터를 가져올 폴더 경로들을 배열에 넣어주세요.
// (경로 구분자는 윈도우의 경우 역슬래시 두 개 '\\' 사용)
const TARGET_FOLDERS = [
  // 'C:\\Users\\User\\Downloads\\AI_Data\\TL_피부과',
  'C:\\Users\\User\\Downloads\\AI_Data\\TL_신경과신경외과',
  'C:\\Users\\User\\Downloads\\AI_Data\\TL_외과',
  'C:\\Users\\User\\Downloads\\AI_Data\\TL_내과',
  // ... 필요한 만큼 계속 추가 가능
];

// 파일 경로를 보고 카테고리(진료과)를 추측하는 함수
function guessCategory(filePath: string): string {
  if (filePath.includes('내과')) return '내과';
  if (filePath.includes('신경')) return '신경과';
  if (filePath.includes('외과')) return '외과';
  if (filePath.includes('피부')) return '피부과';
  return '일반의학'; // 기본값
}

// 배치 사이즈 설정 (Gemini API 최대 한도인 100 권장)
const BATCH_SIZE = 100; 
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`🚀 [스마트 배치 모드] 임베딩 데이터 적재 시작!`);

  // 1. 모든 대상 폴더에서 JSON 파일 리스트 수집
  let allJsonFiles: string[] = [];
  for (const folder of TARGET_FOLDERS) {
    if (fs.existsSync(folder)) {
      const files = getAllJsonFiles(folder);
      console.log(`📁 [${path.basename(folder)}] 폴더 탐색 완료: ${files.length}개 파일`);
      allJsonFiles = [...allJsonFiles, ...files];
    } else {
      console.warn(`⚠️ 경고: 폴더를 찾을 수 없습니다 -> ${folder}`);
    }
  }
  console.log(`👉 총 처리 대상 파일: ${allJsonFiles.length}개`);

  let totalInserted = 0;
  let processingBuffer: any[] = []; // API에 보낼 데이터를 임시로 모아두는 곳

  // 2. 파일 순회 시작
  for (const filePath of allJsonFiles) {
    try {
      // BOM(\uFEFF) 제거 및 파일 읽기
      let fileContent = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
      if (!fileContent.trim()) continue; // 빈 파일 스킵

      const jsonData = JSON.parse(fileContent);
      // 데이터가 배열인지 단일 객체인지 확인
      const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
      const category = guessCategory(filePath);

      for (const item of dataArray) {
        // 필수 필드 체크
        if (!item.question || !item.answer) continue;

        // 질문과 답변을 합쳐서 저장할 텍스트 생성
        const contentText = `[질문]\n${item.question}\n\n[답변]\n${item.answer}`;

        // 3. 버퍼에 담기 (아직 API 호출 안 함)
        processingBuffer.push({
          category,
          content: contentText,
        });

        // 4. 버퍼가 100개가 되면 Gemini에게 한 번에 전송 (Batch Request)
        if (processingBuffer.length >= BATCH_SIZE) {
          await processBatch(processingBuffer);
          totalInserted += processingBuffer.length;
          console.log(`✅ 현재까지 총 ${totalInserted}개 저장 완료 (API 호출 절약 중...)`);
          
          processingBuffer = []; // 버퍼 비우기
          await sleep(1000); // 1초 휴식 (안전한 API 호출을 위해)
        }
      }
    } catch (e) {
      console.error(`❌ 파일 처리 중 에러 (${path.basename(filePath)}):`, e);
      // 에러 난 파일은 건너뛰고 계속 진행
    }
  }

  // 5. 루프가 끝났는데 버퍼에 남은 데이터가 있다면 마저 처리
  if (processingBuffer.length > 0) {
    console.log(`📦 남은 ${processingBuffer.length}개 데이터 처리 중...`);
    await processBatch(processingBuffer);
    totalInserted += processingBuffer.length;
  }

  console.log(`\n🎉 모든 작업 완료! 총 ${totalInserted}건의 의학 지식이 저장되었습니다.`);
}

// 💎 배치 처리 함수 (핵심 로직)
async function processBatch(items: any[]) {
  try {
    // Gemini API 포맷에 맞춰 요청 데이터 변환
    const requests = items.map(item => ({
      content: { role: "user", parts: [{ text: item.content }] }
    }));

    // ⚡ 한 번의 호출로 최대 100개의 임베딩 생성
    const result = await embeddingModel.batchEmbedContents({
      requests: requests
    });

    const embeddings = result.embeddings;

    // 생성된 벡터를 DB에 저장 (하나씩 SQL 실행)
    for (let i = 0; i < items.length; i++) {
      const vector = embeddings[i].values; // 숫자 배열
      const item = items[i];

      // 🛠️ [중요] vector를 JSON.stringify로 감싸야 pgvector가 올바르게 인식합니다.
      await prisma.$executeRaw`
        INSERT INTO "medical_knowledge" ("category", "content", "embedding", "created_at", "updated_at")
        VALUES (${item.category}, ${item.content}, ${JSON.stringify(vector)}::vector, NOW(), NOW())
      `;
    }
  } catch (error) {
    console.error("❌ 배치 API 호출 실패 (해당 묶음은 건너뜁니다):", error);
    // 429 Too Many Requests 에러 등 발생 시 잠시 대기
    await sleep(5000); 
  }
}

// 재귀적으로 하위 폴더까지 뒤져서 JSON 파일을 찾는 함수
function getAllJsonFiles(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllJsonFiles(fullPath, fileList);
    } else if (file.toLowerCase().endsWith('.json')) {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

main()
  .catch((e) => console.error('치명적 오류:', e))
  .finally(async () => await prisma.$disconnect());