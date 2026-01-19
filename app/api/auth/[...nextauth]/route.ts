import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const frontendOrigin = new URL(frontendUrl).origin;
const backendOrigin = new URL(backendUrl).origin;
const useSecureCookies = backendOrigin.startsWith("https://");
const isCrossSite = frontendOrigin !== backendOrigin;

const sessionCookieName = useSecureCookies
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";
const sessionCookieSameSite = isCrossSite && useSecureCookies ? "none" : "lax";

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
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: sessionCookieSameSite,
        path: "/",
        secure: useSecureCookies,
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

    // 프론트 콜백 URL을 우선 사용하고, 허용된 도메인만 리다이렉트합니다.
    async redirect({ url, baseUrl }) {
      if (url.startsWith(frontendOrigin)) {
        return url;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      if (url.startsWith("/")) {
        return `${frontendOrigin}${url}`;
      }

      return `${frontendOrigin}/login`;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
