import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGENDAS, AGENDA_COLORS, statusLabel, STATUS_STYLES } from "@/lib/domain/agendas";
import { buildMonthWeeks, formatDateEs, formatTimeEs, monthLabelEs, shiftYearMonth, todayYmd, ymd } from "@/lib/domain/dates";
import type { AgendaType } from "@/lib/supabase/database.types";

async function resolveDefaultDate(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data } = await supabase
    .from("appointments")
    .select("date")
    .gte("date", todayYmd())
    .neq("status", "cancelada")
    .order("date")
    .limit(1)
    .maybeSingle();
  return data?.date ?? todayYmd();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  await requireUser();

  const supabase = await createClient();
  const { fecha } = await searchParams;
  const explicitDate = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
  const date = explicitDate ?? (await resolveDefaultDate(supabase));
  const [year, month] = date.split("-").map(Number);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const [{ data: monthAppointments }, { data: dayAppointments }] = await Promise.all([
    supabase.from("appointments").select("date, agenda").gte("date", from).lte("date", to).neq("status", "cancelada"),
    supabase
      .from("appointments")
      .select("*, patients(first_name, last_name), insurance_companies(name)")
      .eq("date", date)
      .order("start_time", { nullsFirst: true }),
  ]);

  const agendasByDate = new Map<string, Set<AgendaType>>();
  for (const a of monthAppointments ?? []) {
    if (!agendasByDate.has(a.date)) agendasByDate.set(a.date, new Set());
    agendasByDate.get(a.date)!.add(a.agenda);
  }

  const byAgenda = (agenda: AgendaType) => (dayAppointments ?? []).filter((a) => a.agenda === agenda);

  const weeks = buildMonthWeeks(year, month);
  const today = todayYmd();
  const prevMonth = shiftYearMonth(year, month, -1);
  const nextMonth = shiftYearMonth(year, month, 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold capitalize text-slate-900">
          {formatDateEs(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </h1>
        <p className="text-sm text-slate-500">Citas del día en las tres agendas.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Link href={`/?fecha=${ymd(prevMonth.year, prevMonth.month, 1)}`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Anterior
          </Link>
          <p className="text-sm font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</p>
          <Link href={`/?fecha=${ymd(nextMonth.year, nextMonth.month, 1)}`} className="text-sm text-slate-500 hover:text-slate-900">
            Siguiente →
          </Link>
        </div>
        <p className="text-center text-xs text-slate-400">Los puntos de color indican qué agendas tienen citas ese día.</p>
        <div className="rounded-xl border border-slate-200 bg-white p-1.5">
          <div className="grid grid-cols-7 text-center">
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
              <span key={d} className="text-[11px] font-medium text-slate-400">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((cell, cellIndex) => {
                if (!cell) return <div key={cellIndex} />;
                const dayAgendas = agendasByDate.get(cell.date);
                const isToday = cell.date === today;
                const isSelected = cell.date === date;
                return (
                  <Link
                    key={cellIndex}
                    href={`/?fecha=${cell.date}`}
                    className={`relative flex h-10 flex-col items-center justify-center gap-0.5 rounded-md text-xs hover:bg-slate-50 ${
                      isSelected ? "ring-2 ring-brand-600" : isToday ? "ring-2 ring-slate-900" : ""
                    } ${dayAgendas ? "font-semibold text-slate-900" : "text-slate-300"}`}
                  >
                    {cell.day}
                    <span className="flex gap-0.5">
                      {AGENDAS.map((a) =>
                        dayAgendas?.has(a.value) ? (
                          <span key={a.value} className={`h-1.5 w-1.5 rounded-full ${AGENDA_COLORS[a.value].dot}`} />
                        ) : null,
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <form method="get" className="flex items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="fecha" className="text-sm font-medium text-slate-700">
            Ir a una fecha
          </label>
          <input
            id="fecha"
            type="date"
            name="fecha"
            defaultValue={date}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-base"
          />
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Ver
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        {AGENDAS.map((agenda) => {
          const colors = AGENDA_COLORS[agenda.value];
          const items = byAgenda(agenda.value);

          return (
            <section
              key={agenda.value}
              className={`rounded-xl border-x border-b border-t-4 border-slate-200 bg-white shadow-sm ${colors.border}`}
            >
              <div className="flex items-center justify-between px-4 pt-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                  <h2 className="font-medium text-slate-900">{agenda.label}</h2>
                </div>
                <Link href={`/agenda/${agenda.value}?fecha=${date}`} className={`text-xs font-medium ${colors.text}`}>
                  Ver agenda
                </Link>
              </div>

              <ul className="space-y-2 p-3">
                {items.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/citas/${a.id}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:border-slate-300"
                    >
                      <span className="w-12 text-sm font-medium text-slate-900">
                        {a.start_time ? formatTimeEs(a.start_time) : "—"}
                      </span>
                      <span className="flex-1 text-sm">
                        <span className="block text-slate-900">
                          {a.particular_label ?? (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "—")}
                        </span>
                        <span className="block text-xs text-slate-500">{a.insurance_companies?.name ?? "Particular"}</span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                        {statusLabel(a.status)}
                      </span>
                    </Link>
                  </li>
                ))}
                {items.length === 0 && <p className="px-1 py-2 text-sm text-slate-500">Sin citas.</p>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
