import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Evita que la app se pueda incrustar en un <iframe> de otra web (clickjacking):
          // sin esto, alguien podría superponer botones invisibles sobre la interfaz real.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // El navegador no debe intentar adivinar el tipo de un fichero servido distinto
          // del declarado (mitiga ataques que abusan de esa detección automática).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No enviar la URL completa como referrer a sitios externos (los enlaces de
          // WhatsApp abren wa.me con datos del paciente en la propia URL de esta app).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
