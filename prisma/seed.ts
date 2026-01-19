import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 시딩(Seeding) 시작...");

  // 1. 초기화 (삭제 순서: 자식 -> 부모)
  // FK 제약 조건 때문에 가장 하위 자식인 Disease부터 삭제해야 합니다.
  try {
    await prisma.searchHistory.deleteMany(); 
  } catch (e) {}

  // Disease -> BodyPart -> BodySystem 순서로 삭제
  try {
    // 모델명이 Disease라고 가정 (schema.prisma에 정의된 이름)
    // 만약 모델명이 다르면(예: diseases) 수정 필요
    await prisma.disease.deleteMany(); 
  } catch (e) {
    console.log("⚠️ Disease 테이블이 아직 없거나 삭제 실패 (무시 가능)");
  }
  
  await prisma.bodyPart.deleteMany();
  await prisma.bodySystem.deleteMany();

  console.log("🧹 기존 데이터 삭제 완료");

  // 2. 데이터 정의 (계통 -> 부위 -> 질환)
  const systemsData = [
    {
      code: "SKELETAL",
      nameKo: "근골격계",
      nameEn: "Musculoskeletal System",
      description: "몸의 형태를 유지하고 움직임을 담당하며, 장기를 보호하는 뼈와 근육 시스템",
      parts: [
        { 
          code: "KNEE", nameKo: "무릎", nameEn: "Knee", 
          desc: "대퇴골과 정강이뼈를 연결하며 체중을 지탱하고 다리의 굴곡/신전 운동을 담당하는 인체에서 가장 큰 관절입니다.",
          roles: ["체중 지탱", "다리 굴곡 및 신전", "충격 흡수"],
          obs: ["부종 및 열감", "관절 가동 범위", "보행 시 통증 여부"],
          diseases: [
            { name: "퇴행성 관절염", desc: "연골이 닳아 뼈와 뼈가 부딪히며 통증을 유발하는 질환", symptoms: "관절 통증, 붓기, 활동 시 소리", severity: 3, medical: true },
            { name: "반월상 연골 파열", desc: "무릎 충격 흡수를 담당하는 연골판이 찢어지는 부상", symptoms: "무릎 걸림 현상, 심한 통증, 부종", severity: 4, medical: true },
            { name: "슬개건염", desc: "슬개골과 정강이뼈를 잇는 힘줄에 염증이 생기는 질환", symptoms: "무릎 앞쪽 통증, 점프 시 통증", severity: 2, medical: false },
          ]
        },
        { 
          code: "SHOULDER", nameKo: "어깨", nameEn: "Shoulder", 
          desc: "상완골과 견갑골이 만나 이루어지는 관절로, 우리 몸에서 가장 넓은 운동 범위를 가지고 있어 손의 자유로운 사용을 돕습니다.",
          roles: ["팔의 광범위한 운동", "상체 힘 전달", "손의 위치 조정"],
          obs: ["팔을 들어올릴 때 통증", "어깨 비대칭", "회전근개 파열 징후"],
          diseases: [
            { name: "오십견(유착성 관절낭염)", desc: "어깨 관절 주머니가 굳어 움직임이 제한되는 질환", symptoms: "극심한 어깨 통증, 팔을 들어올리기 힘듦", severity: 3, medical: true },
            { name: "회전근개 파열", desc: "어깨를 감싸는 힘줄이 찢어지는 질환", symptoms: "팔을 올릴 때 특정 각도에서 통증, 근력 약화", severity: 4, medical: true },
            { name: "석회화 건염", desc: "어깨 힘줄에 석회질(돌)이 생겨 통증을 유발하는 상태", symptoms: "갑작스럽고 극심한 통증", severity: 4, medical: true },
          ]
        },
        { 
          code: "SPINE", nameKo: "척추", nameEn: "Spine", 
          desc: "목에서 꼬리뼈까지 이어지는 뼈 구조물로, 신체의 중심축을 이루어 몸을 지지하고 척수 신경을 보호하는 중요한 역할을 합니다.",
          roles: ["신체 중심축 지지", "척수 보호", "유연한 움직임 제공"],
          obs: ["자세 불균형(측만)", "허리 디스크 통증", "하지 방사통 유무"],
          diseases: [
            { name: "허리 디스크(추간판 탈출증)", desc: "디스크가 신경을 눌러 통증을 유발하는 질환", symptoms: "허리 통증, 다리 저림(방사통)", severity: 4, medical: true },
            { name: "척추관 협착증", desc: "신경이 지나가는 통로가 좁아져 신경을 압박하는 병", symptoms: "오래 걷기 힘듦, 다리 터질듯한 통증", severity: 3, medical: true },
            { name: "척추 측만증", desc: "척추가 옆으로 휘어지는 변형", symptoms: "양쪽 어깨 높이 다름, 골반 비대칭", severity: 2, medical: true },
          ]
        },
      ],
    },
    {
      code: "CARDIO",
      nameKo: "심혈관계",
      nameEn: "Cardiovascular System",
      description: "혈액을 순환시켜 산소와 영양분을 공급하고 노폐물을 제거하는 시스템",
      parts: [
        { 
          code: "HEART", nameKo: "심장", nameEn: "Heart", 
          desc: "강력한 근육으로 이루어진 펌프 기관으로, 규칙적인 수축과 이완을 통해 혈액을 온몸으로 순환시켜 생명을 유지합니다.",
          roles: ["혈액을 펌핑", "산소와 영양분 공급", "노폐물 운반"],
          obs: ["흉부 압박감", "불규칙한 심박(부정맥)", "호흡 곤란"],
          diseases: [
            { name: "협심증", desc: "심장 혈관이 좁아져 산소 공급이 부족해지는 질환", symptoms: "가슴 쥐어짜는 통증, 호흡곤란", severity: 4, medical: true },
            { name: "심근경색", desc: "심장 혈관이 완전히 막혀 심장 근육이 괴사하는 응급 질환", symptoms: "30분 이상 지속되는 극심한 가슴 통증", severity: 5, medical: true },
            { name: "부정맥", desc: "심장 박동이 불규칙하게 뛰는 상태", symptoms: "두근거림, 어지러움, 실신", severity: 3, medical: true },
          ]
        },
        { 
          code: "AORTA", nameKo: "대동맥", nameEn: "Aorta", 
          desc: "심장의 좌심실에서 시작되는 우리 몸에서 가장 굵은 동맥으로, 산소가 풍부한 혈액을 전신으로 내보내는 고속도로 역할을 합니다.",
          roles: ["전신으로 혈액 운반", "혈압 유지", "혈류 조절"],
          obs: ["복부 박동성 덩어리", "등 쪽의 찢어지는 듯한 통증", "혈압 차이"],
          diseases: [
            { name: "대동맥 박리", desc: "대동맥 내막이 찢어져 혈액이 틈으로 들어가는 초응급 질환", symptoms: "등 쪽의 찢어지는 듯한 격통", severity: 5, medical: true },
            { name: "대동맥류", desc: "대동맥이 풍선처럼 부풀어 오르는 병", symptoms: "무증상인 경우 많음, 복부 펄떡이는 덩어리", severity: 4, medical: true },
            { name: "대동맥 축착", desc: "대동맥 일부가 좁아져 혈류 장애가 생기는 선천성 기형", symptoms: "고혈압, 다리 맥박 약함", severity: 3, medical: true },
          ]
        },
      ],
    },
    {
      code: "RESPIRATORY",
      nameKo: "호흡기계",
      nameEn: "Respiratory System",
      description: "산소를 흡입하고 이산화탄소를 배출하는 가스 교환 시스템",
      parts: [
        { 
          code: "LUNG", nameKo: "폐", nameEn: "Lung", 
          desc: "가슴 양쪽에 위치한 스펀지 모양의 기관으로, 숨을 들이마셔 혈액에 산소를 공급하고 노폐물인 이산화탄소를 배출합니다.",
          roles: ["가스 교환(산소<->이산화탄소)", "pH 조절", "호흡 유지"],
          obs: ["기침 및 가래", "청진 시 이상 호흡음", "호흡곤란 정도"],
          diseases: [
            { name: "폐렴", desc: "세균이나 바이러스 등에 의해 폐에 염증이 생기는 질환", symptoms: "고열, 기침, 누런 가래", severity: 4, medical: true },
            { name: "천식", desc: "기도가 예민해져 좁아지며 숨쉬기 힘들어지는 알레르기 질환", symptoms: "쌕쌕거리는 숨소리, 호흡곤란", severity: 3, medical: true },
            { name: "만성 폐쇄성 폐질환(COPD)", desc: "흡연 등으로 기도가 좁아지고 폐 기능이 저하되는 병", symptoms: "만성 기침, 운동 시 호흡곤란", severity: 4, medical: true },
          ]
        },
        { 
          code: "TRACHEA", nameKo: "기관", nameEn: "Trachea", 
          desc: "후두에서 폐로 공기를 전달하는 튜브 모양의 통로로, 점막과 섬모가 있어 외부 먼지나 이물질을 걸러내는 방어 작용도 수행합니다.",
          roles: ["공기 이동 통로", "이물질 배출(섬모 운동)", "가습 및 온도 조절"],
          obs: ["그르렁거리는 소리(협착)", "이물감", "호흡 시 목의 함몰"],
          diseases: [
            { name: "급성 기관지염", desc: "기관지에 바이러스나 세균 감염으로 염증이 생기는 병", symptoms: "심한 기침, 가래, 미열", severity: 2, medical: true },
            { name: "기관 협착", desc: "기도가 좁아져 호흡이 어려워지는 상태", symptoms: "호흡 시 거친 소리(천명음)", severity: 4, medical: true },
            { name: "기도 이물", desc: "음식물 등이 기도로 잘못 넘어가 막히는 응급 상황", symptoms: "갑작스러운 기침, 호흡곤란, 청색증", severity: 5, medical: true },
          ]
        },
      ],
    },
    {
      code: "DIGESTIVE",
      nameKo: "소화기계",
      nameEn: "Digestive System",
      description: "음식물을 섭취, 소화하여 영양분을 흡수하고 찌꺼기를 배출하는 시스템",
      parts: [
        { 
          code: "STOMACH", nameKo: "위", nameEn: "Stomach", 
          desc: "J자 모양의 주머니로, 강한 산성의 위액을 분비하여 섭취한 음식물을 살균하고 단백질 분해를 시작하며 죽 같은 형태로 만듭니다.",
          roles: ["음식물 저장 및 분쇄", "단백질 소화 시작", "살균 작용(위산)"],
          obs: ["속쓰림 및 신물", "상복부 통증", "식욕 부진 및 구토"],
          diseases: [
            { name: "위염", desc: "위 점막에 염증이 생기는 흔한 질환", symptoms: "속쓰림, 소화불량, 구역감", severity: 2, medical: true },
            { name: "위궤양", desc: "위 점막이 패여 근육층까지 손상된 상태", symptoms: "식후 명치 통증, 속쓰림, 흑변", severity: 3, medical: true },
            { name: "역류성 식도염", desc: "위산이 식도로 역류해 염증을 일으키는 질환", symptoms: "가슴 쓰림(타는 듯한 통증), 신물 역류", severity: 2, medical: true },
          ]
        },
        { 
          code: "LIVER", nameKo: "간", nameEn: "Liver", 
          desc: "인체에서 가장 큰 장기로, 영양소 저장 및 대사, 해독 작용, 쓸개즙 생성 등 500가지가 넘는 역할을 수행하는 화학 공장입니다.",
          roles: ["해독 작용", "영양소 대사 및 저장", "쓸개즙 생성"],
          obs: ["피부 및 안구 황달", "우상복부 통증", "만성 피로감"],
          diseases: [
            { name: "지방간", desc: "간에 지방이 과도하게 쌓이는 상태", symptoms: "대부분 무증상, 피로감", severity: 2, medical: true },
            { name: "간염(A,B,C형)", desc: "바이러스 감염 등으로 간에 염증이 생기는 질환", symptoms: "황달, 피로, 식욕부진, 갈색 소변", severity: 3, medical: true },
            { name: "간경변증", desc: "만성 염증으로 간이 딱딱하게 굳어 기능을 잃는 상태", symptoms: "복수, 황달, 토혈", severity: 5, medical: true },
          ]
        },
        { 
          code: "PANCREAS", nameKo: "췌장", nameEn: "Pancreas", 
          desc: "소화 효소를 분비하여 소화를 돕고, 인슐린과 글루카곤을 분비하여 혈당을 조절하는 내분비 및 외분비 기능을 동시에 가진 기관입니다.",
          roles: ["소화 효소 분비", "혈당 조절(인슐린)", "중탄산염 분비"],
          obs: ["등으로 뻗치는 복통", "기름진 변(지방변)", "급격한 체중 감소"],
          diseases: [
            { name: "급성 췌장염", desc: "췌장 효소가 췌장 자체를 공격해 염증이 생기는 병", symptoms: "참을 수 없는 복통, 구토", severity: 4, medical: true },
            { name: "당뇨병", desc: "인슐린 분비량이 부족하거나 기능이 떨어져 혈당이 오르는 대사 질환", symptoms: "다뇨, 다음, 다식, 체중 감소", severity: 3, medical: true },
            { name: "췌장 낭종", desc: "췌장에 물주머니(혹)가 생기는 상태", symptoms: "대부분 무증상, 복부 불쾌감", severity: 2, medical: true },
          ]
        },
        { 
          code: "INTESTINE", nameKo: "장", nameEn: "Intestine", 
          desc: "소장과 대장으로 이루어진 긴 관으로, 음식물의 최종 소화와 영양분 흡수가 이루어지며 남은 찌꺼기를 수분 흡수 후 배출합니다.",
          roles: ["영양분 흡수", "수분 재흡수", "배변 활동"],
          obs: ["설사 또는 변비", "복부 팽만감", "혈변 유무"],
          diseases: [
            { name: "과민성 대장 증후군", desc: "기질적 원인 없이 배변 습관 변화와 복통이 반복되는 질환", symptoms: "복통, 설사 또는 변비, 가스", severity: 2, medical: true },
            { name: "급성 장염", desc: "바이러스나 세균, 상한 음식에 의한 염증", symptoms: "설사, 복통, 구토, 발열", severity: 2, medical: true },
            { name: "충수돌기염(맹장염)", desc: "맹장 끝 충수돌기에 염증이 생기는 응급 질환", symptoms: "오른쪽 아랫배 통증, 구토", severity: 4, medical: true },
          ]
        },
      ],
    },
    {
      code: "NERVOUS",
      nameKo: "신경계",
      nameEn: "Nervous System",
      description: "신체 내외부의 자극을 감지하고 판단하여 반응을 조절하는 정보 전달 시스템",
      parts: [
        { 
          code: "BRAIN", nameKo: "뇌", nameEn: "Brain", 
          desc: "두개골 안에 위치한 신경계의 사령탑으로, 기억, 감정, 언어, 판단력 등 고등 정신 작용과 신체의 모든 생명 활동을 관장합니다.",
          roles: ["인지 및 기억", "운동 및 감각 조절", "생명 활동 유지"],
          obs: ["두통 및 어지럼증", "말어눌함(언어 장애)", "의식 수준 변화"],
          diseases: [
            { name: "뇌졸중(중풍)", desc: "뇌혈관이 막히거나 터져 뇌세포가 손상되는 질환", symptoms: "한쪽 팔다리 마비, 언어장애, 심한 두통", severity: 5, medical: true },
            { name: "편두통", desc: "혈관성 원인 등으로 발생하는 반복적인 두통", symptoms: "욱신거리는 두통, 구역질, 빛/소리 과민", severity: 3, medical: true },
            { name: "알츠하이머 치매", desc: "뇌세포 퇴화로 기억력과 인지 기능이 점차 저하되는 병", symptoms: "기억력 감퇴, 길 잃음, 성격 변화", severity: 4, medical: true },
          ]
        },
        { 
          code: "SPINAL_CORD", nameKo: "척수", nameEn: "Spinal Cord", 
          desc: "척추뼈 안을 지나가는 긴 신경 다발로, 뇌의 명령을 신체로 전달하고 신체의 감각을 뇌로 전달하며 무릎 반사 같은 반사 작용을 조절합니다.",
          roles: ["뇌와 신체 간 신호 전달", "반사 작용 조절", "운동 명령 하달"],
          obs: ["팔다리 저림 및 감각 이상", "근력 약화", "보행 장애"],
          diseases: [
            { name: "척수 손상", desc: "사고 등으로 척수가 다쳐 마비가 오는 상태", symptoms: "다친 부위 이하 감각/운동 마비", severity: 5, medical: true },
            { name: "척수염", desc: "척수에 염증이 생겨 신경 기능을 방해하는 질환", symptoms: "배변/배뇨 장애, 감각 이상, 마비", severity: 4, medical: true },
            { name: "척수 종양", desc: "척수나 그 주변에 생기는 종양", symptoms: "등 통증, 점진적인 다리 약화", severity: 4, medical: true },
          ]
        },
      ],
    },
    {
      code: "SKIN",
      nameKo: "피부계",
      nameEn: "Integumentary System",
      description: "외부 환경으로부터 몸을 보호하고 체온 조절 및 감각을 담당하는 시스템",
      parts: [
        { 
          code: "SKIN", nameKo: "피부", nameEn: "Skin", 
          desc: "우리 몸 전체를 감싸고 있는 가장 넓은 기관으로, 세균 침입을 막고 수분 손실을 방지하며 체온을 조절하고 감각을 느낍니다.",
          roles: ["신체 보호 장벽", "체온 조절", "감각 수용"],
          obs: ["발진 및 두드러기", "색소 침착 변화", "가려움증 및 건조"],
          diseases: [
            { name: "아토피 피부염", desc: "만성적인 알레르기 염증성 피부 질환", symptoms: "심한 가려움, 피부 건조, 발진", severity: 2, medical: true },
            { name: "두드러기", desc: "피부가 부풀어 오르며 가려운 증상", symptoms: "모기 물린 듯한 팽진, 가려움", severity: 1, medical: true },
            { name: "접촉성 피부염", desc: "특정 물질에 닿아 발생하는 피부 염증", symptoms: "닿은 부위의 붉은 발진, 따가움", severity: 2, medical: true },
            { name: "대상포진", desc: "바이러스가 신경을 따라 수포와 통증을 일으키는 질환", symptoms: "띠 모양의 물집, 바늘로 찌르는 듯한 통증", severity: 4, medical: true },
          ]
        },
      ],
    },
  ];

  // 3. 데이터 생성 루프
  for (const sys of systemsData) {
    // 3-1. BodySystem 생성
    const createdSystem = await prisma.bodySystem.create({
      data: {
        code: sys.code,
        nameKo: sys.nameKo,
        nameEn: sys.nameEn,
        description: sys.description,
      },
    });
    console.log(`✅ System 생성: ${sys.nameKo}`);

    // 3-2. BodyPart 생성
    for (const part of sys.parts) {
      const createdPart = await prisma.bodyPart.create({
        data: {
          systemId: createdSystem.id,
          code: part.code,
          nameKo: part.nameKo,
          nameEn: part.nameEn,
          description: part.desc,
          viewCount: Math.floor(Math.random() * 9900) + 100,
          keyRoles: part.roles, 
          observationPoints: part.obs,
        },
      });

      // 3-3. Disease 생성 (여기서 질환 데이터 추가!)
      if (part.diseases && part.diseases.length > 0) {
        for (const disease of part.diseases) {
          await prisma.disease.create({
            data: {
              bodyPartId: createdPart.id, // 생성된 부위 ID 연결
              name: disease.name,
              description: disease.desc,
              commonSymptoms: disease.symptoms, // common_symptoms 매핑
              severityLevel: disease.severity,  // severity_level 매핑
              requiresMedicalAttention: disease.medical, // 매핑
            }
          });
        }
        console.log(`   💊 질환 ${part.diseases.length}개 추가 완료`);
      }
    }
  }

  console.log("🎉 모든 데이터 시딩 완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });