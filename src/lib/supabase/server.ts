import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";
import { isFakeBackendEnabled } from "@/lib/dev/fake-mode";
import { createFakeServerClient } from "@/lib/dev/fake-client";

// Crear un cliente nuevo en cada request de servidor (Server Component, Server Action o Route Handler).
export async function createClient(): Promise<SupabaseClient<Database>> {
  if (isFakeBackendEnabled()) {
    // Objeto en memoria con la misma forma (.from/.auth) que el cliente real; ver src/lib/dev/.
    return createFakeServerClient() as unknown as SupabaseClient<Database>;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Se llama desde un Server Component sin permiso de escritura de cookies;
          // el refresco de sesión ya lo gestiona proxy.ts en cada navegación.
        }
      },
    },
  });
}
