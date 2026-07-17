import { LoginForm } from "./login-form";
import { isFakeBackendEnabled, FAKE_CREDENTIALS } from "@/lib/dev/fake-mode";
import { isSafeRedirect } from "@/lib/redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirectTo && isSafeRedirect(params.redirectTo) ? params.redirectTo : "/";
  return (
    <LoginForm
      redirectTo={redirectTo}
      demoHint={isFakeBackendEnabled() ? `Modo demo (sin Supabase): ${FAKE_CREDENTIALS.email} / ${FAKE_CREDENTIALS.password}` : null}
    />
  );
}
