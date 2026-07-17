"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirect } from "@/lib/redirect";

export type SignInState = { error?: string } | undefined;

export async function signInAction(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!email || !password) {
    return { error: "Introduce el correo y la contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Ese correo aún no está confirmado. Confírmalo desde Supabase (Authentication → Users) o desactiva la confirmación de email en Authentication → Providers → Email." };
    }
    return { error: `Correo o contraseña incorrectos (${error.code ?? error.message}).` };
  }

  redirect(isSafeRedirect(redirectTo) ? redirectTo : "/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
