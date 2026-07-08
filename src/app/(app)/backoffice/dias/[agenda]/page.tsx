import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agendaLabel, isAgendaType, weekdayLabel } from "@/lib/domain/agendas";
import { buildMonthWeeks, formatYearMonthParam, monthLabelEs, parseYearMonth, shiftYearMonth, todayYmd } from "@/lib/domain/dates";
import { clearAgendaDayScheduleAction, scheduleMonthAction, setAgendaDayScheduleAction, toggleAgendaDayAction } from "@/lib/actions/agenda-days";
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
    supabase.from("agenda_config").select("default_weekdays, start_time, end_time").eq("agenda", agenda).single(),
    supabase
      .from("agenda_days")
      .select("date, is_open, start_time_override, end_time_override")
      .eq("agenda", agenda)
      .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
      .lte("date", `${year}-${String(month).padStart(2, "0")}-31`)
      .order("date"),
  ]);

  const dayState = new Map((days ?? []).map((d) => [d.date, d.is_open]));
  const overrides = (days ?? []).filter((d) => d.start_time_override && d.end_time_override);
  const overrideDates = new Set(overrides.map((d) => d.date));
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

      <div className="rounded-xl border border-slate-200 bg-white p-1.5 sm:p-2">
        <div className="grid grid-cols-7 text-center">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <span key={d} className="text-[11px] font-medium text-slate-400">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-0.5 py-0.5">
            {week.map((cell, cellIndex) => {
              if (!cell) return <div key={cellIndex} />;
              const isOpen = dayState.get(cell.date) ?? false;
              const isToday = cell.date === today;
              const hasOverride = overrideDates.has(cell.date);
              return (
                <form key={cellIndex} action={toggleAgendaDayAction.bind(null, agenda, cell.date, !isOpen)} className="relative">
                  <button
                    type="submit"
                    className={`h-9 w-full rounded-md text-xs font-medium ${
                      isOpen ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    } ${isToday ? "ring-2 ring-offset-1 ring-slate-900" : ""}`}
                  >
                    {cell.day}
                  </button>
                  {hasOverride && (
                    <span className="pointer-events-none absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </form>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-100" /> Abierto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-100" /> Cerrado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> Horario especial
        </span>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="font-medium text-slate-900">Horario especial de un día</h2>
          <p className="text-sm text-slate-500">
            Para una semana puntual con otro día u otra hora. Abre el día con el horario que quieras, sin tocar el
            patrón general. Si quieres además cambiar de día de la semana, cierra el día habitual de esa semana y
            abre aquí la fecha alternativa.
          </p>
        </div>

        <form action={setAgendaDayScheduleAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="agenda" value={agenda} />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="special-date">
              Fecha
            </label>
            <input id="special-date" name="date" type="date" required className="rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="special-start">
              Hora inicio
            </label>
            <input
              id="special-start"
              name="start_time"
              type="time"
              required
              defaultValue={config?.start_time?.slice(0, 5)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="special-end">
              Hora fin
            </label>
            <input
              id="special-end"
              name="end_time"
              type="time"
              required
              defaultValue={config?.end_time?.slice(0, 5)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Guardar horario especial
          </button>
        </form>

        {overrides.length > 0 && (
          <ul className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
            {overrides.map((day) => (
              <li key={day.date} className="flex items-center justify-between py-2 text-sm">
                <span className="capitalize text-slate-900">
                  {day.date} · {day.start_time_override?.slice(0, 5)}–{day.end_time_override?.slice(0, 5)}
                </span>
                <form action={clearAgendaDayScheduleAction.bind(null, agenda, day.date)}>
                  <button type="submit" className="text-slate-500 hover:text-slate-900">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
