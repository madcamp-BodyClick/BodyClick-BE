import GoogleAutoSignIn from "./google-auto-signin";

type LoginGooglePageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

export default async function LoginGooglePage({
  searchParams,
}: LoginGooglePageProps) {
  const resolvedSearchParams = await searchParams;
  const callbackUrl =
    typeof resolvedSearchParams?.callbackUrl === "string"
      ? resolvedSearchParams.callbackUrl
      : undefined;
  const error =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : undefined;

  return <GoogleAutoSignIn callbackUrl={callbackUrl} error={error} />;
}
