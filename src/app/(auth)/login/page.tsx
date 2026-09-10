import { Suspense } from "react";
import { getOAuthAvailability } from "@/lib/oauth";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const oauth = getOAuthAvailability();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b14]" />}>
      <LoginForm google={oauth.google} twitter={oauth.twitter} />
    </Suspense>
  );
}
