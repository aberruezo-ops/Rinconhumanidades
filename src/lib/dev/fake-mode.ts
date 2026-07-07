// Bypass de Supabase SOLO para previsualizar la app en local sin un proyecto
// real todavía (login falso + datos en memoria). Se activa con DEV_FAKE_BACKEND=true
// y nunca se activa en un build de producción, aunque alguien deje la variable puesta.
export function isFakeBackendEnabled(): boolean {
  return process.env.DEV_FAKE_BACKEND === "true" && process.env.NODE_ENV !== "production";
}

export const FAKE_SESSION_COOKIE = "dante_fake_session";

export const FAKE_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "olga@dante.local",
};

export const FAKE_CREDENTIALS = {
  email: "olga@dante.local",
  password: "dante1234",
};
