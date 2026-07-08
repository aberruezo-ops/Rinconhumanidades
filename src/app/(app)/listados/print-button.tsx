"use client";

export function PrintButton() {
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
