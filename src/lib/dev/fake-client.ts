import { cookies } from "next/headers";
import { FakeQueryBuilder } from "@/lib/dev/fake-query-builder";
import { getFakeStore } from "@/lib/dev/fake-db";
import { FAKE_CREDENTIALS, FAKE_SESSION_COOKIE, FAKE_USER } from "@/lib/dev/fake-mode";

// Cliente "de mentira" con la misma forma que usa el resto de la app
// (`.from(tabla)...` y `.auth.getUser()/signInWithPassword()/signOut()`), pero en
// memoria y sin red. Solo se instancia cuando DEV_FAKE_BACKEND=true (ver fake-mode.ts).
export function createFakeServerClient() {
  const store = getFakeStore();

  return {
    from(table: string) {
      return new FakeQueryBuilder(table, store);
    },
    auth: {
      async getUser() {
        const store = await cookies();
        const logged = store.get(FAKE_SESSION_COOKIE)?.value === "1";
        return { data: { user: logged ? FAKE_USER : null }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (email === FAKE_CREDENTIALS.email && password === FAKE_CREDENTIALS.password) {
          const store = await cookies();
          store.set(FAKE_SESSION_COOKIE, "1", { httpOnly: true, path: "/", sameSite: "lax" });
          return { data: { user: FAKE_USER }, error: null };
        }
        return {
          data: { user: null },
          error: { message: `Credenciales incorrectas (modo demo: ${FAKE_CREDENTIALS.email} / ${FAKE_CREDENTIALS.password})` },
        };
      },
      async signOut() {
        const store = await cookies();
        store.delete(FAKE_SESSION_COOKIE);
        return { error: null };
      },
    },
  };
}
