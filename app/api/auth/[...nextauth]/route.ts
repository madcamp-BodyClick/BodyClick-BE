import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login/google",
  },

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },

  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },

  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
    
    // ⚠️ 수정 포인트: 절대 경로(http://localhost:3000)를 명시합니다.
    async redirect({ url, baseUrl }) {
      // "/explore"라고만 쓰면 4000번(현재 위치)에서 찾으므로 404가 뜹니다.
      // 반드시 "http://localhost:3000"을 앞에 붙여주세요.
      return "http://localhost:3000/explore";
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
