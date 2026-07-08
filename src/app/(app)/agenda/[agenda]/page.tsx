import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { agendaLabel, isAgendaType } from "@/lib/domain/agendas";
import { addDays, formatDateEs, todayYmd } from "@/lib/domain/dates";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import type { AgendaType } from "@/lib/supabase/database.types";

type Vista = "dia" | "semana" | "mes";

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ agenda: string }>;
  searchParams: Promise<{ vista?: string; fecha?: string }>;
}) {
  const user = await requireUser();

  const { agenda: agendaParam } = await params;
  if (!isAgendaType(agendaParam)) notFound();
  const agenda: AgendaType = agendaParam;

  const { vista: vistaParam, fecha } = await searchParams;
  const vista: Vista = vistaParam === "semana" || vistaParam === "mes" ? vistaParam : "dia";
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : todayYmd();
  const [year, month] = date.split("-").map(Number);

  const prevDate = vista === "semana" ? addDays(date, -7) : addDays(date, -1);
  const nextDate = vista === "semana" ? addDays(date, 7) : addDays(date, 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{agendaLabel(agenda)}</h1>
        {user.role === "admin" && (
          <div className="flex gap-2">
            <Link
              href={`/citas/dictado?agenda=${agenda}&fecha=${date}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              🎤 Dictar
            </Link>
            <Link
              href={`/citas/nueva?agenda=${agenda}&fecha=${date}`}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 px-3 py-1.5 text-sm font-medium text-white"
            >
              + Nueva cita
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {(["dia", "semana", "mes"] as const).map((v) => (
          <Link
            key={v}
            href={`/agenda/${agenda}?vista=${v}&fecha=${date}`}
            className={`flex-1 rounded-md py-1.5 text-center font-medium ${
              vista === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
          </Link>
        ))}
      </div>

      {vista !== "mes" && (
        <div className="flex items-center justify-between">
          <Link href={`/agenda/${agenda}?vista=${vista}&fecha=${prevDate}`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Anterior
          </Link>
          <span className="text-sm font-medium capitalize text-slate-700">
            {vista === "dia"
              ? formatDateEs(date, { weekday: "long", day: "numeric", month: "long" })
              : `Semana del ${formatDateEs(date, { day: "numeric", month: "long" })}`}
          </span>
          <Link href={`/agenda/${agenda}?vista=${vista}&fecha=${nextDate}`} className="text-sm text-slate-500 hover:text-slate-900">
            Siguiente →
          </Link>
        </div>
      )}

      {vista === "dia" && <DayView agenda={agenda} date={date} />}
      {vista === "semana" && <WeekView agenda={agenda} date={date} />}
      {vista === "mes" && <MonthView agenda={agenda} year={year} month={month} />}
    </div>
  );
}
