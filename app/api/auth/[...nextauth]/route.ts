import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";

const handler = NextAuth({
  // 1. Prisma 어댑터 연결 (구글 로그인 성공 시 DB에 자동 저장)
  adapter: PrismaAdapter(prisma) as any,

  // 2. 로그인 공급자 설정 (구글만 남김)
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // 3. 세션 설정
  session: {
    strategy: "jwt", // JWT 토큰 방식 사용
  },

  // 4. 콜백 설정 (세션에 유저 ID 포함시키기 위함)
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // session.user타입에 id가 없다고 에러가 날 수 있으므로 any로 우회하거나 타입을 확장해야 함
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };