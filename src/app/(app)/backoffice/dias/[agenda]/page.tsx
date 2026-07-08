import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agendaLabel, isAgendaType, weekdayLabel } from "@/lib/domain/agendas";
import {
  formatDateEs,
  formatYearMonthParam,
  monthLabelEs,
  parseYearMonth,
  shiftYearMonth,
  weeksOverlappingMonth,
} from "@/lib/domain/dates";
import { saveWeekAction, scheduleMonthAction } from "@/lib/actions/agenda-days";
import type { AgendaType } from "@/lib/supabase/database.types";

const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

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

  const weeks = weeksOverlappingMonth(year, month);
  const rangeFrom = weeks[0][0];
  const rangeTo = weeks[weeks.length - 1][6];

  const supabase = await createClient();
  const [{ data: config }, { data: days }] = await Promise.all([
    supabase.from("agenda_config").select("default_weekdays, start_time, end_time").eq("agenda", agenda).single(),
    supabase
      .from("agenda_days")
      .select("date, is_open, start_time_override, end_time_override")
      .eq("agenda", agenda)
      .gte("date", rangeFrom)
      .lte("date", rangeTo),
  ]);

  const dayByDate = new Map((days ?? []).map((d) => [d.date, d]));
  const prev = shiftYearMonth(year, month, -1);
  const next = shiftYearMonth(year, month, 1);
  const patternLabel = (config?.default_weekdays ?? [])
    .slice()
    .sort()
    .map(weekdayLabel)
    .join(", ");
  const defaultStart = config?.start_time?.slice(0, 5) ?? "16:00";
  const defaultEnd = config?.end_time?.slice(0, 5) ?? "19:30";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Días — {agendaLabel(agenda)}</h1>
        <p className="text-sm text-slate-500">
          {patternLabel ? `Patrón por defecto: ${patternLabel}.` : "Esta agenda no tiene días por defecto configurados."}{" "}
          Marca en cada semana qué día o días hay consulta y a qué hora. Una semana sin ningún día marcado queda
          cerrada.
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
            Mes siguiente →
          </Link>
        </div>

        <form action={scheduleMonthAction.bind(null, agenda, year, month)}>
          <button
            type="submit"
            disabled={!config?.default_weekdays?.length}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Rellenar según patrón
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {weeks.map((week, weekIndex) => {
          const openWithOverride = week
            .map((date) => dayByDate.get(date))
            .find((d) => d?.is_open && d.start_time_override && d.end_time_override);
          const weekStart = openWithOverride?.start_time_override?.slice(0, 5) ?? defaultStart;
          const weekEnd = openWithOverride?.end_time_override?.slice(0, 5) ?? defaultEnd;

          return (
            <div key={weekIndex} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium capitalize text-slate-700">
                Semana del {formatDateEs(week[0], { day: "numeric", month: "short" })} al{" "}
                {formatDateEs(week[6], { day: "numeric", month: "short" })}
              </p>
              <form action={saveWeekAction} className="space-y-3">
                <input type="hidden" name="agenda" value={agenda} />
                <input type="hidden" name="week_dates" value={JSON.stringify(week)} />

                <div className="flex flex-wrap gap-1.5">
                  {week.map((date, i) => {
                    const isOpen = dayByDate.get(date)?.is_open ?? false;
                    const inMonth = Number(date.slice(5, 7)) === month;
                    return (
                      <label
                        key={date}
                        className={`flex flex-col items-center gap-0.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white ${
                          inMonth ? "" : "opacity-50"
                        }`}
                      >
                        <input type="checkbox" name="selected_dates" value={date} defaultChecked={isOpen} className="sr-only" />
                        <span>{WEEKDAY_SHORT[i]}</span>
                        <span className="font-medium">{Number(date.slice(8, 10))}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Hora inicio</label>
                    <input
                      type="time"
                      name="start_time"
                      defaultValue={weekStart}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Hora fin</label>
                    <input
                      type="time"
                      name="end_time"
                      defaultValue={weekEnd}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white">
                  Guardar semana
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
