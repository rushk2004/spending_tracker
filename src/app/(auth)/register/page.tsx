import { getOAuthAvailability } from "@/lib/oauth";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const oauth = getOAuthAvailability();
  return <RegisterForm google={oauth.google} twitter={oauth.twitter} />;
}
