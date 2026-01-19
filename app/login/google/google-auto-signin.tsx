"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

type GoogleAutoSignInProps = {
  callbackUrl?: string;
  error?: string;
};

export default function GoogleAutoSignIn({
  callbackUrl,
  error,
}: GoogleAutoSignInProps) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (error) return;
    if (startedRef.current) return;
    startedRef.current = true;
    void signIn("google", { callbackUrl });
  }, [callbackUrl, error]);

  return (
    <main style={{ padding: "24px" }}>
      <p>
        {error
          ? "Google sign-in failed. Please try again."
          : "Redirecting to Google sign-in..."}
      </p>
      <button type="button" onClick={() => signIn("google", { callbackUrl })}>
        Continue
      </button>
    </main>
  );
}
