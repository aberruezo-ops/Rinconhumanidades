import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
};

// proxy.ts ya redirige a /login si no hay sesión; esto además carga el perfil (rol, nombre)
// y es el punto único a usar en páginas/acciones que necesiten saber quién es y con qué permisos.
// Tanto el layout como cada página llaman a requireUser(), así que se memoiza por petición
// (React cache) para no repetir el viaje a Supabase (auth + perfil) dos veces en cada navegación.
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: profile?.role ?? "admin",
  };
});

export function requireAdmin(user: CurrentUser) {
  if (user.role !== "admin") {
    redirect("/");
  }
}
