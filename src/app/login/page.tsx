import { LoginForm } from "./login-form";
import { isFakeBackendEnabled, FAKE_CREDENTIALS } from "@/lib/dev/fake-mode";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      redirectTo={params.redirectTo ?? "/"}
      demoHint={isFakeBackendEnabled() ? `Modo demo (sin Supabase): ${FAKE_CREDENTIALS.email} / ${FAKE_CREDENTIALS.password}` : null}
    />
  );
}
