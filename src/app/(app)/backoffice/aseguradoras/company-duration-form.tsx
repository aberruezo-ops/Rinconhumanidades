"use client";

import { useActionState, useState } from "react";
import { updateInsuranceCompanyDurationAction, type DurationFormState } from "@/lib/actions/insurance-companies";

export function CompanyDurationForm({
  companyId,
  durationMinutes,
  agendaDefaultDurationMinutes,
}: {
  companyId: string;
  durationMinutes: number | null;
  agendaDefaultDurationMinutes: number;
}) {
  const boundAction = updateInsuranceCompanyDurationAction.bind(null, companyId);
  const [state, formAction, pending] = useActionState<DurationFormState, FormData>(boundAction, undefined);
  const [mode, setMode] = useState<"default" | "custom">(durationMinutes == null ? "default" : "custom");
  const [minutes, setMinutes] = useState(durationMinutes ?? agendaDefaultDurationMinutes);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1.5">
        <input
          type="radio"
          name="duration_mode"
          value="default"
          checked={mode === "default"}
          onChange={() => setMode("default")}
        />
        Por defecto ({agendaDefaultDurationMinutes} min)
      </label>
      <label className="flex items-center gap-1.5">
        <input
          type="radio"
          name="duration_mode"
          value="custom"
          checked={mode === "custom"}
          onChange={() => setMode("custom")}
        />
        Personalizada
      </label>
      <input
        type="number"
        name="duration_minutes"
        min={5}
        max={240}
        step={5}
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        disabled={mode !== "custom"}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 disabled:bg-slate-50 disabled:text-slate-400"
      />
      <span className="text-slate-500">min</span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-2.5 py-1 text-slate-600 hover:border-slate-400 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
