"use client";

import { useState } from "react";

// window.confirm() no es fiable en iOS cuando la app está añadida a la pantalla de inicio
// (modo standalone): a veces no muestra nada y devuelve false sin más, con lo que el botón
// parece no responder. Confirmación propia en dos toques, sin depender de diálogos nativos:
// el primer toque muestra el mensaje y dos botones (confirmar/no); el segundo, si se confirma,
// sí envía el formulario.
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm text-slate-700">{confirmMessage}</p>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
          >
            Sí, confirmar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className={className} onClick={() => setConfirming(true)}>
      {children}
    </button>
  );
}
