"use client";

import { useActionState } from "react";
import { updateAgendaConfigAction, type AgendaConfigState } from "@/lib/actions/agenda-config";
import { WEEKDAY_LABELS } from "@/lib/domain/agendas";
import type { Database } from "@/lib/supabase/database.types";

type AgendaConfigRow = Database["public"]["Tables"]["agenda_config"]["Row"];

export function AgendaConfigForm({ config, label }: { config: AgendaConfigRow; label: string }) {
  const [state, formAction, pending] = useActionState<AgendaConfigState, FormData>(
    updateAgendaConfigAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="agenda" value={config.agenda} />
      <h2 className="font-medium text-slate-900">{label}</h2>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Días por defecto</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((dayLabel, index) => {
            const isoDay = index + 1;
            return (
              <label
                key={isoDay}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
              >
                <input
                  type="checkbox"
                  name="default_weekdays"
                  value={isoDay}
                  defaultChecked={config.default_weekdays.includes(isoDay)}
                  className="sr-only"
                />
                {dayLabel.slice(0, 3)}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor={`${config.agenda}-duration`}>
            Duración de cita (min)
          </label>
          <input
            id={`${config.agenda}-duration`}
            name="default_duration_minutes"
            type="number"
            min={5}
            max={240}
            step={5}
            defaultValue={config.default_duration_minutes}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor={`${config.agenda}-notice`}>
            Días de antelación del aviso
          </label>
          <input
            id={`${config.agenda}-notice`}
            name="notice_days_default"
            type="number"
            min={0}
            max={90}
            defaultValue={config.notice_days_default}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor={`${config.agenda}-start`}>
            Inicio de jornada
          </label>
          <input
            id={`${config.agenda}-start`}
            name="start_time"
            type="time"
            defaultValue={config.start_time.slice(0, 5)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor={`${config.agenda}-end`}>
            Fin de jornada
          </label>
          <input
            id={`${config.agenda}-end`}
            name="end_time"
            type="time"
            defaultValue={config.end_time.slice(0, 5)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">Guardado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
