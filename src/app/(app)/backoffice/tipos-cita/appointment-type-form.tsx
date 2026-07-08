"use client";

import { useActionState, useRef, useEffect } from "react";
import { createAppointmentTypeAction, type AppointmentTypeFormState } from "@/lib/actions/appointment-types";

export function AppointmentTypeForm() {
  const [state, formAction, pending] = useActionState<AppointmentTypeFormState, FormData>(
    createAppointmentTypeAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="type-name" className="text-sm font-medium text-slate-700">
          Nombre
        </label>
        <input
          id="type-name"
          name="name"
          required
          placeholder="Ej. Cura"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="type-duration" className="text-sm font-medium text-slate-700">
          Duración (min)
        </label>
        <input
          id="type-duration"
          name="default_duration_minutes"
          type="number"
          min={5}
          max={240}
          step={5}
          defaultValue={15}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Añadiendo…" : "Añadir"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
