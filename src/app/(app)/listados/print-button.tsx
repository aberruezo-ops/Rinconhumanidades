"use client";

import { useEffect, useState } from "react";

// En iOS, cuando la app está añadida a la pantalla de inicio, se abre en modo "standalone"
// (a pantalla completa, sin la barra de Safari) y window.print() no hace nada — es una
// limitación de iOS, no un fallo nuestro. La única forma de imprimir/generar el PDF en ese
// caso es abrir la misma página en Safari, donde sí funciona.
function isStandaloneDisplay(): boolean {
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return iosStandalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

export function PrintButton() {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
  }, []);

  if (standalone) {
    return (
      <a
        href={typeof window !== "undefined" ? window.location.href : "#"}
        target="_blank"
        rel="noopener noreferrer"
        title="Se abre en Safari, donde sí funciona imprimir y generar el PDF"
        className="inline-block rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-center text-sm font-medium text-white"
      >
        Abrir en Safari para imprimir
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.print()}
      title="En el diálogo, elige 'Guardar como PDF' para descargarlo en vez de imprimirlo"
      className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white"
    >
      Imprimir / Generar PDF
    </button>
  );
}
