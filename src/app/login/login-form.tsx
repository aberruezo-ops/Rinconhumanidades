"use client";

import { useState } from "react";
import { useActionState } from "react";
import Image from "next/image";
import { signInAction, type SignInState } from "@/lib/actions/auth";

export function LoginForm({ redirectTo, demoHint }: { redirectTo: string; demoHint: string | null }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={32} height={25} priority />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Dante</h1>
            <p className="text-sm text-slate-500">Agenda de la consulta de traumatología</p>
          </div>
        </div>

        {demoHint && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{demoHint}</p>}

        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              enterKeyHint="go"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 pr-16 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-brand-700"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-3 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
