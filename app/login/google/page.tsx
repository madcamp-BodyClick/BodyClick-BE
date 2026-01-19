import { redirect } from "next/navigation";
import GoogleAutoSignIn from "./google-auto-signin";

type LoginGooglePageProps = {
  searchParams?: {
    callbackUrl?: string;
    error?: string;
  };
};

export default function LoginGooglePage({ searchParams }: LoginGooglePageProps) {
  const callbackUrl =
    typeof searchParams?.callbackUrl === "string"
      ? searchParams.callbackUrl
      : undefined;
  const error =
    typeof searchParams?.error === "string" ? searchParams.error : undefined;

  if (error) {
    const params = new URLSearchParams();
    if (callbackUrl) {
      params.set("callbackUrl", callbackUrl);
    }
    const qs = params.toString();
    redirect(qs ? `/login/google?${qs}` : "/login/google");
  }

  return <GoogleAutoSignIn callbackUrl={callbackUrl} error={error} />;
}
