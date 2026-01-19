import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import GoogleLoginButton from "./google-login-button";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/");
  }

  return (
    <main style={{ padding: "24px" }}>
      <h1>로그인</h1>
      <p>Google 계정으로 로그인해주세요.</p>
      <GoogleLoginButton />
    </main>
  );
}
