"use client";

import { useActionState, useRef, useState } from "react";
import { createCandidatoAction, type CandidatoFormState } from "@/lib/actions/quirofano-candidatos";
import { PatientPicker } from "@/app/(app)/citas/_components/patient-picker";

export function CandidatoForm() {
  const [state, formAction, pending] = useActionState<CandidatoFormState, FormData>(createCandidatoAction, undefined);
  const [patientMode, setPatientMode] = useState<"registrado" | "particular">("registrado");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="font-medium text-slate-900">Nuevo candidato</p>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="patient_mode"
            value="registrado"
            checked={patientMode === "registrado"}
            onChange={() => setPatientMode("registrado")}
          />
          Registrado
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="patient_mode"
            value="particular"
            checked={patientMode === "particular"}
            onChange={() => setPatientMode("particular")}
          />
          Particular (sin registrar)
        </label>
      </div>

      {patientMode === "registrado" ? (
        <PatientPicker onPatientSelected={() => {}} />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500" htmlFor="particular_label">
              Nombre
            </label>
            <input
              id="particular_label"
              name="particular_label"
              placeholder="Nombre"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500" htmlFor="particular_phone">
              Teléfono
            </label>
            <input
              id="particular_phone"
              name="particular_phone"
              type="tel"
              inputMode="tel"
              required
              placeholder="Teléfono"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="desired_date">
          Fecha aproximada deseada (opcional)
        </label>
        <input
          id="desired_date"
          name="desired_date"
          type="date"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="observations">
          Observaciones
        </label>
        <textarea
          id="observations"
          name="observations"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Añadir candidato"}
      </button>
    </form>
  );
}
