"use client";

import { signIn } from "next-auth/react";

export default function GoogleLoginButton() {
  return (
    <button type="button" onClick={() => signIn("google")}>
      Google로 로그인
    </button>
  );
}
