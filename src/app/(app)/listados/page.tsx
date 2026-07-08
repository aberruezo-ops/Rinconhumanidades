import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGENDAS, agendaLabel, APPOINTMENT_STATUSES, isAgendaType, statusLabel } from "@/lib/domain/agendas";
import { formatDateEs, formatTimeEs, todayYmd } from "@/lib/domain/dates";
import { PrintButton } from "./print-button";

export default async function ListadosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; agenda?: string; estado?: string }>;
}) {
  await requireUser();

  const { fecha, agenda: agendaParam, estado: estadoParam } = await searchParams;
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : todayYmd();
  const agenda = agendaParam && isAgendaType(agendaParam) ? agendaParam : undefined;
  const estado = APPOINTMENT_STATUSES.find((s) => s.value === estadoParam)?.value;

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("*, patients(first_name, last_name), insurance_companies(name)")
    .eq("date", date)
    .order("agenda")
    .order("start_time");

  if (agenda) query = query.eq("agenda", agenda);
  if (estado) query = query.eq("status", estado);

  const { data: appointments } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-slate-900">Listados</h1>
        <PrintButton />
      </div>

      <form className="flex flex-wrap items-end gap-3 print:hidden" method="get">
        <div className="space-y-1">
          <label htmlFor="fecha" className="text-sm font-medium text-slate-700">
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            name="fecha"
            defaultValue={date}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="agenda" className="text-sm font-medium text-slate-700">
            Agenda
          </label>
          <select
            id="agenda"
            name="agenda"
            defaultValue={agenda ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todas</option>
            {AGENDAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="estado" className="text-sm font-medium text-slate-700">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todos</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-medium capitalize text-slate-900">
          {formatDateEs(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {agenda ? ` — ${agendaLabel(agenda)}` : ""}
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:rounded-none print:border-0">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-2 font-medium">Hora</th>
                <th className="px-3 py-2 font-medium">Agenda</th>
                <th className="px-3 py-2 font-medium">Paciente</th>
                <th className="px-3 py-2 font-medium">Compañía</th>
                <th className="px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments?.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{a.start_time ? formatTimeEs(a.start_time) : "—"}</td>
                  <td className="px-3 py-2">{agendaLabel(a.agenda)}</td>
                  <td className="px-3 py-2">
                    {a.particular_label ?? (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "—")}
                  </td>
                  <td className="px-3 py-2">{a.insurance_companies?.name ?? "Particular"}</td>
                  <td className="px-3 py-2">{statusLabel(a.status)}</td>
                </tr>
              ))}
              {appointments?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Sin citas para estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
