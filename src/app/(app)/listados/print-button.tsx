"use client";

import { useEffect, useState } from "react";

export type PrintableRow = {
  fecha?: string;
  hora: string;
  agenda: string;
  paciente: string;
  telefono: string;
  compania: string;
  estado: string;
};

// En iOS, cuando la app está añadida a la pantalla de inicio, se abre en modo "standalone"
// (a pantalla completa, sin Safari) y window.print() no hace nada — limitación de iOS. Abrir
// la página en Safari con un enlace no es fiable (varía según la versión de iOS), así que en
// ese caso se genera el PDF directamente en el propio dispositivo y se descarga: eso sí
// funciona siempre, porque descargar un fichero no depende del diálogo de impresión.
function isStandaloneDisplay(): boolean {
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return iosStandalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

// El atributo download de un <a> no siempre respeta nombres con acentos u otros caracteres no
// ASCII (varía según navegador/versión) y el fichero acaba llamándose genéricamente "download".
// Se usa solo para el nombre del fichero descargado; el título mostrado en pantalla y dentro
// del PDF sigue con acentos normales.
function toAsciiFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "");
}

export function PrintButton({
  title,
  filename,
  rows,
  showFecha,
}: {
  title: string;
  filename: string;
  rows: PrintableRow[];
  showFecha: boolean;
}) {
  const [standalone, setStandalone] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
  }, []);

  async function downloadPdf() {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(14);
      doc.text(title, 14, 15);

      const head = showFecha
        ? ["Fecha", "Hora", "Agenda", "Paciente", "Teléfono", "Compañía", "Estado"]
        : ["Hora", "Agenda", "Paciente", "Teléfono", "Compañía", "Estado"];
      const body = rows.map((r) =>
        showFecha
          ? [r.fecha ?? "", r.hora, r.agenda, r.paciente, r.telefono, r.compania, r.estado]
          : [r.hora, r.agenda, r.paciente, r.telefono, r.compania, r.estado],
      );

      autoTable(doc, { head: [head], body, startY: 22, styles: { fontSize: 9 } });

      // doc.save() delega el nombre del fichero a lógica interna de la librería que en algunos
      // entornos (empaquetado de Next.js) acaba ignorándolo. Descarga explícita con blob + <a
      // download> para que el nombre se respete siempre.
      const blobUrl = URL.createObjectURL(doc.output("blob"));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${toAsciiFilename(filename)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } finally {
      setGenerating(false);
    }
  }

  if (standalone) {
    return (
      <button
        type="button"
        onClick={downloadPdf}
        disabled={generating}
        title="Genera y descarga el PDF directamente: aquí no funciona el diálogo de imprimir de iOS"
        className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {generating ? "Generando…" : "Descargar PDF"}
      </button>
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
