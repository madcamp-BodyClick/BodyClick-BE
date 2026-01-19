import { withAuth } from "next-auth/middleware";

// 1. withAuth를 직접 실행해서 내보내면 Next.js가 "아, 이게 미들웨어 함수구나!"라고 확실하게 인식합니다.
export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => {
      // 토큰(로그인 정보)이 있으면 true(통과), 없으면 false(리다이렉트) 반환
      return !!token;
    },
  },
});

// 2. matcher 설정 (기존과 동일)
export const config = {
  matcher: [
    /*
     * 아래 경로를 *제외*한 모든 경로에 미들웨어가 동작합니다.
     * - api (API 라우트)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     * - docs (Swagger 문서)
     */
    "/((?!api|docs|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
