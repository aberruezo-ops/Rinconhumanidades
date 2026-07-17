// redirectTo llega siempre desde un valor no fiable (parámetro de la URL, campo oculto de un
// formulario): cualquiera puede compartir un enlace de login con un redirectTo manipulado. Una
// comprobación de solo "empieza por /" no basta — "//evil.com" también empieza por "/" y el
// navegador lo interpreta como una URL a otro dominio (mismo esquema, protocol-relative). Se
// exige una ruta interna real: un único "/" inicial, no dos.
export function isSafeRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}
