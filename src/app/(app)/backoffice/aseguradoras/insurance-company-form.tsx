"use client";

import { useActionState, useRef, useEffect } from "react";
import { createInsuranceCompanyAction, type CompanyFormState } from "@/lib/actions/insurance-companies";

export function InsuranceCompanyForm() {
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(
    createInsuranceCompanyAction,
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
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Nueva compañía
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ej. Adeslas"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Añadiendo…" : "Añadir"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
