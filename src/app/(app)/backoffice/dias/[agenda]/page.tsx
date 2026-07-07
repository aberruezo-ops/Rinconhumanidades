import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agendaLabel, isAgendaType, weekdayLabel } from "@/lib/domain/agendas";
import { buildMonthWeeks, formatYearMonthParam, monthLabelEs, parseYearMonth, shiftYearMonth, todayYmd } from "@/lib/domain/dates";
import { scheduleMonthAction, toggleAgendaDayAction } from "@/lib/actions/agenda-days";
import type { AgendaType } from "@/lib/supabase/database.types";

export default async function BackofficeAgendaDaysPage({
  params,
  searchParams,
}: {
  params: Promise<{ agenda: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  requireAdmin(user);

  const { agenda: agendaParam } = await params;
  if (!isAgendaType(agendaParam)) notFound();
  const agenda: AgendaType = agendaParam;

  const { mes } = await searchParams;
  const now = new Date();
  const { year, month } = parseYearMonth(mes, { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });

  const supabase = await createClient();
  const [{ data: config }, { data: days }] = await Promise.all([
    supabase.from("agenda_config").select("default_weekdays").eq("agenda", agenda).single(),
    supabase
      .from("agenda_days")
      .select("date, is_open")
      .eq("agenda", agenda)
      .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
      .lte("date", `${year}-${String(month).padStart(2, "0")}-31`),
  ]);

  const dayState = new Map((days ?? []).map((d) => [d.date, d.is_open]));
  const weeks = buildMonthWeeks(year, month);
  const today = todayYmd();

  const prev = shiftYearMonth(year, month, -1);
  const next = shiftYearMonth(year, month, 1);
  const patternLabel = (config?.default_weekdays ?? [])
    .slice()
    .sort()
    .map(weekdayLabel)
    .join(", ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Días — {agendaLabel(agenda)}</h1>
        <p className="text-sm text-slate-500">
          {patternLabel ? `Patrón por defecto: ${patternLabel}.` : "Esta agenda no tiene días por defecto configurados."}{" "}
          Un día sin marcar se considera cerrado.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`?mes=${formatYearMonthParam(prev.year, prev.month)}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Anterior
          </Link>
          <span className="font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</span>
          <Link
            href={`?mes=${formatYearMonthParam(next.year, next.month)}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Siguiente →
          </Link>
        </div>

        <form action={scheduleMonthAction.bind(null, agenda, year, month)}>
          <button
            type="submit"
            disabled={!config?.default_weekdays?.length}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Programar mes según patrón
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 pb-1 text-center">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <span key={d} className="text-xs font-medium text-slate-500">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1 py-0.5">
            {week.map((cell, cellIndex) => {
              if (!cell) return <div key={cellIndex} />;
              const isOpen = dayState.get(cell.date) ?? false;
              const isToday = cell.date === today;
              return (
                <form key={cellIndex} action={toggleAgendaDayAction.bind(null, agenda, cell.date, !isOpen)}>
                  <button
                    type="submit"
                    className={`aspect-square w-full rounded-lg text-sm font-medium ${
                      isOpen ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    } ${isToday ? "ring-2 ring-offset-1 ring-slate-900" : ""}`}
                  >
                    {cell.day}
                  </button>
                </form>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-100" /> Abierto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-100" /> Cerrado
        </span>
      </div>
    </div>
  );
}
