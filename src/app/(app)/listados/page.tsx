import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGENDAS, agendaLabel, APPOINTMENT_STATUSES, isAgendaType, statusLabel, STATUS_STYLES, reminderUrgency } from "@/lib/domain/agendas";
import { formatDateEs, formatTimeEs, hoursUntilAppointment, todayYmd } from "@/lib/domain/dates";
import { buildReminderMessage } from "@/lib/domain/whatsapp";
import { PrintButton } from "./print-button";
import { WhatsappButton } from "../_components/whatsapp-button";
import { markWhatsappSentAction } from "@/lib/actions/appointments";

type Filters = { fecha?: string; agenda?: string; estado?: string; aviso?: string };

function presetHref(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.fecha) params.set("fecha", filters.fecha);
  if (filters.agenda) params.set("agenda", filters.agenda);
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.aviso) params.set("aviso", filters.aviso);
  const qs = params.toString();
  return qs ? `/listados?${qs}` : "/listados";
}

export default async function ListadosPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  await requireUser();

  const { fecha, agenda: agendaParam, estado: estadoParam, aviso: avisoParam } = await searchParams;
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined;
  const agenda = agendaParam && isAgendaType(agendaParam) ? agendaParam : undefined;
  const estado = APPOINTMENT_STATUSES.find((s) => s.value === estadoParam)?.value;
  const aviso = avisoParam === "pendiente" || avisoParam === "enviado" ? avisoParam : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("*, patients(first_name, last_name, phone), insurance_companies(name)")
    .order("date")
    .order("agenda")
    .order("start_time", { nullsFirst: true });

  if (date) {
    query = query.eq("date", date);
  } else {
    query = query.gte("date", todayYmd());
  }
  if (agenda) query = query.eq("agenda", agenda);
  if (estado) query = query.eq("status", estado);
  if (aviso === "pendiente") query = query.is("whatsapp_sent_at", null);
  if (aviso === "enviado") query = query.not("whatsapp_sent_at", "is", null);

  const { data: appointments } = await query;

  const PRESETS: { label: string; filters: Filters }[] = [
    { label: "Hoy", filters: { fecha: todayYmd() } },
    { label: "Traumatología", filters: { agenda: "traumatologo" } },
    { label: "Enfermería", filters: { agenda: "enfermeria" } },
    { label: "Quirófano", filters: { agenda: "quirofano" } },
    { label: "Confirmada sin avisar", filters: { estado: "confirmada_sin_avisar" } },
    { label: "Por avisar (WhatsApp)", filters: { aviso: "pendiente" } },
    { label: "Todas las próximas", filters: {} },
  ];

  const isActivePreset = (filters: Filters) =>
    (filters.fecha ?? "") === (date ?? "") &&
    (filters.agenda ?? "") === (agenda ?? "") &&
    (filters.estado ?? "") === (estado ?? "") &&
    (filters.aviso ?? "") === (aviso ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-slate-900">Listados</h1>
        <PrintButton />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {PRESETS.map((preset) => {
          const active = isActivePreset(preset.filters);
          return (
            <a
              key={preset.label}
              href={presetHref(preset.filters)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                active ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              {preset.label}
            </a>
          );
        })}
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
            defaultValue={date ?? ""}
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
        <div className="space-y-1">
          <label htmlFor="aviso" className="text-sm font-medium text-slate-700">
            Aviso WhatsApp
          </label>
          <select
            id="aviso"
            name="aviso"
            defaultValue={aviso ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente de enviar</option>
            <option value="enviado">Ya enviado</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-medium capitalize text-slate-900">
          {date ? formatDateEs(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Próximas citas"}
          {agenda ? ` — ${agendaLabel(agenda)}` : ""}
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm print:w-full print:min-w-0">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                {!date && <th className="px-3 py-2 font-medium">Fecha</th>}
                <th className="px-3 py-2 font-medium">Hora</th>
                <th className="px-3 py-2 font-medium">Agenda</th>
                <th className="px-3 py-2 font-medium">Paciente</th>
                <th className="px-3 py-2 font-medium">Compañía</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium print:hidden">Aviso</th>
              </tr>
            </thead>
            <tbody>
              {appointments?.map((a) => {
                const patientName = a.particular_label ?? (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "—");
                const canNotify = !!a.patients?.phone && a.status !== "cancelada" && a.status !== "completada";
                return (
                  <tr key={a.id} className="border-b border-slate-100">
                    {!date && <td className="px-3 py-2">{formatDateEs(a.date, { day: "numeric", month: "short" })}</td>}
                    <td className="px-3 py-2">{a.start_time ? formatTimeEs(a.start_time) : "—"}</td>
                    <td className="px-3 py-2">{agendaLabel(a.agenda)}</td>
                    <td className="px-3 py-2">{patientName}</td>
                    <td className="px-3 py-2">{a.insurance_companies?.name ?? "Particular"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                        {statusLabel(a.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right print:hidden">
                      {canNotify && a.patients?.phone ? (
                        <WhatsappButton
                          onMarkSent={markWhatsappSentAction.bind(null, a.id)}
                          phone={a.patients.phone}
                          sentAt={a.whatsapp_sent_at}
                          urgency={reminderUrgency(hoursUntilAppointment(a.date, a.start_time))}
                          message={buildReminderMessage({
                            patientFirstName: a.patients.first_name,
                            agendaLabel: agendaLabel(a.agenda),
                            dateLabel: formatDateEs(a.date, { weekday: "long", day: "numeric", month: "long" }),
                            timeLabel: a.start_time ? formatTimeEs(a.start_time) : null,
                          })}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {appointments?.length === 0 && (
                <tr>
                  <td colSpan={date ? 6 : 7} className="px-3 py-6 text-center text-slate-500">
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
