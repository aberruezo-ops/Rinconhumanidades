import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGENDAS, AGENDA_COLORS, statusLabel, STATUS_STYLES } from "@/lib/domain/agendas";
import { formatDateEs, formatTimeEs, todayYmd } from "@/lib/domain/dates";
import type { AgendaType } from "@/lib/supabase/database.types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  await requireUser();

  const { fecha } = await searchParams;
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : todayYmd();

  const supabase = await createClient();
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, patients(first_name, last_name), insurance_companies(name)")
    .eq("date", date)
    .order("start_time", { nullsFirst: true });

  const byAgenda = (agenda: AgendaType) => (appointments ?? []).filter((a) => a.agenda === agenda);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold capitalize text-slate-900">
          {formatDateEs(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </h1>
        <p className="text-sm text-slate-500">Citas del día en las tres agendas.</p>
      </div>

      <form method="get" className="flex items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="fecha" className="text-sm font-medium text-slate-700">
            Fecha
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
