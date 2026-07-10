import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGENDAS, AGENDA_COLORS, agendaLabel, statusLabel, statusStyle, reminderUrgency, normalizeStatus } from "@/lib/domain/agendas";
import {
  addDays,
  buildMonthWeeks,
  daysInMonth,
  daysBetween,
  formatDateEs,
  formatTimeEs,
  formatYearMonthParam,
  hoursUntilAppointment,
  monthLabelEs,
  shiftYearMonth,
  todayYmd,
  ymd,
} from "@/lib/domain/dates";
import { generateSlotStarts, isSlotFree, timeToMinutes, type OccupiedInterval } from "@/lib/domain/slots";
import { buildReminderMessage } from "@/lib/domain/whatsapp";
import { markWhatsappSentAction } from "@/lib/actions/appointments";
import { markCandidatoWhatsappSentAction } from "@/lib/actions/quirofano-candidatos";
import { WhatsappButton } from "./_components/whatsapp-button";
import type { AgendaType } from "@/lib/supabase/database.types";

const CANDIDATO_REMINDER_WINDOW_DAYS = 30;

async function loadPacientesPorAvisar(supabase: Awaited<ReturnType<typeof createClient>>, today: string) {
  const [{ data: appointments }, { data: agendaConfigs }, { data: candidatos }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, patients(first_name, last_name, phone), insurance_companies(name)")
      .is("whatsapp_sent_at", null)
      .gte("date", today)
      .neq("status", "cancelada")
      .neq("status", "completada")
      .order("date"),
    supabase.from("agenda_config").select("agenda, notice_days_default"),
    supabase
      .from("quirofano_candidatos")
      .select("*, patients(first_name, last_name, phone)")
      .eq("status", "pendiente")
      .is("whatsapp_sent_at", null)
      .not("desired_date", "is", null)
      .order("desired_date"),
  ]);

  const noticeDaysByAgenda = new Map((agendaConfigs ?? []).map((c) => [c.agenda, c.notice_days_default]));

  const appointmentReminders = (appointments ?? [])
    .filter((a) => daysBetween(today, a.date) <= (noticeDaysByAgenda.get(a.agenda) ?? 0))
    .map((a) => ({ kind: "cita" as const, sortDate: a.date, appointment: a }));

  const candidatoReminders = (candidatos ?? [])
    .filter((c) => c.desired_date && daysBetween(today, c.desired_date) <= CANDIDATO_REMINDER_WINDOW_DAYS)
    .map((c) => ({ kind: "candidato" as const, sortDate: c.desired_date!, candidato: c }));

  return [...appointmentReminders, ...candidatoReminders].sort((a, b) => a.sortDate.localeCompare(b.sortDate));
}

async function loadRecordatoriosManana(supabase: Awaited<ReturnType<typeof createClient>>, tomorrow: string) {
  const { data } = await supabase
    .from("appointments")
    .select("*, patients(first_name, last_name, phone), insurance_companies(name)")
    .eq("date", tomorrow)
    .neq("status", "cancelada")
    .order("agenda")
    .order("start_time", { nullsFirst: true });

  const all = data ?? [];
  const pendientes = all.filter((a) => !!a.patients?.phone && a.whatsapp_sent_at == null);
  return { total: all.length, pendientes };
}

async function resolveDefaultDate(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data } = await supabase
    .from("agenda_days")
    .select("date")
    .eq("is_open", true)
    .gte("date", todayYmd())
    .order("date")
    .limit(1)
    .maybeSingle();
  return data?.date ?? todayYmd();
}

// Al navegar a "mes siguiente/anterior" no tiene sentido aterrizar siempre en el día 1: si ese
// día está cerrado (como pasa siempre que el 1 cae en fin de semana) parece que no hay nada
// programado. Se busca el primer día abierto de cualquier agenda dentro de ese mes; si el mes
// entero no tiene ningún día abierto todavía (p. ej. no se ha programado aún), se cae al día 1.
async function resolveDefaultDateInMonth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
  month: number,
): Promise<string> {
  const from = ymd(year, month, 1);
  const to = ymd(year, month, daysInMonth(year, month));
  const { data } = await supabase
    .from("agenda_days")
    .select("date")
    .eq("is_open", true)
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .limit(1)
    .maybeSingle();
  return data?.date ?? from;
}

// Huecos libres del día para una agenda con hora (traumatólogo / quirófano). Enfermería no
// tiene slots (no lleva hora), así que no pasa por aquí.
function freeSlotsFor(
  agenda: AgendaType,
  dayRow: { agenda: AgendaType; is_open: boolean; start_time_override: string | null; end_time_override: string | null } | undefined,
  config: { agenda: AgendaType; start_time: string; end_time: string; default_duration_minutes: number } | undefined,
  dayAppointments: { agenda: AgendaType; status: string; start_time: string | null; duration_minutes: number | null }[],
): { isOpen: boolean; slots: string[] } {
  const isOpen = dayRow?.is_open ?? false;
  if (!isOpen || !config) return { isOpen, slots: [] };

  const occupied: OccupiedInterval[] = dayAppointments
    .filter((a) => a.agenda === agenda && normalizeStatus(a.status) !== "cancelada" && a.start_time && a.duration_minutes)
    .map((a) => ({
      start: timeToMinutes(a.start_time!.slice(0, 5)),
      end: timeToMinutes(a.start_time!.slice(0, 5)) + a.duration_minutes!,
    }));

  const jornadaStart = (dayRow?.start_time_override ?? config.start_time).slice(0, 5);
  const jornadaEnd = (dayRow?.end_time_override ?? config.end_time).slice(0, 5);
  const slots = generateSlotStarts(jornadaStart, jornadaEnd, config.default_duration_minutes).filter((slot) =>
    isSlotFree(slot, config.default_duration_minutes, occupied),
  );
  return { isOpen, slots };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; mes?: string }>;
}) {
  await requireUser();

  const supabase = await createClient();
  const today = todayYmd();
  const tomorrow = addDays(today, 1);
  const { fecha, mes } = await searchParams;
  const explicitDate = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
  const explicitMonthMatch = !explicitDate ? mes?.match(/^(\d{4})-(\d{2})$/) : null;
  const explicitMonth = explicitMonthMatch ? { year: Number(explicitMonthMatch[1]), month: Number(explicitMonthMatch[2]) } : null;

  // Ninguna de las tres depende de las otras (todas cuelgan de today/tomorrow, no del `date`
  // ya resuelto), así que se lanzan juntas en vez de esperar una detrás de otra.
  const [resolvedDate, pacientesPorAvisar, recordatoriosManana] = await Promise.all([
    explicitDate
      ? Promise.resolve(explicitDate)
      : explicitMonth
        ? resolveDefaultDateInMonth(supabase, explicitMonth.year, explicitMonth.month)
        : resolveDefaultDate(supabase),
    loadPacientesPorAvisar(supabase, today),
    loadRecordatoriosManana(supabase, tomorrow),
  ]);
  const date = resolvedDate;
  const [year, month] = date.split("-").map(Number);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const [{ data: monthAgendaDays }, { data: dayAppointments }, { data: dayRows }, { data: configs }] = await Promise.all([
    supabase.from("agenda_days").select("date, agenda").eq("is_open", true).gte("date", from).lte("date", to),
    supabase
      .from("appointments")
      .select("*, patients(first_name, last_name, phone), insurance_companies(name)")
      .eq("date", date)
      .order("start_time", { nullsFirst: true }),
    supabase.from("agenda_days").select("agenda, is_open, start_time_override, end_time_override").eq("date", date),
    supabase.from("agenda_config").select("agenda, start_time, end_time, default_duration_minutes"),
  ]);

  const agendasByDate = new Map<string, Set<AgendaType>>();
  for (const d of monthAgendaDays ?? []) {
    if (!agendasByDate.has(d.date)) agendasByDate.set(d.date, new Set());
    agendasByDate.get(d.date)!.add(d.agenda);
  }

  const byAgenda = (agenda: AgendaType) => (dayAppointments ?? []).filter((a) => a.agenda === agenda);

  const weeks = buildMonthWeeks(year, month);
  const prevMonth = shiftYearMonth(year, month, -1);
  const nextMonth = shiftYearMonth(year, month, 1);

  const enfermeriaOpen = dayRows?.find((d) => d.agenda === "enfermeria")?.is_open ?? false;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold capitalize text-slate-900">
          {formatDateEs(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </h1>
        <p className="text-sm text-slate-500">Citas del día en las tres agendas.</p>
      </div>

      {pacientesPorAvisar.length > 0 && (
        <div className="space-y-2 rounded-xl border border-accent-100 bg-accent-100/30 p-3">
          <h2 className="text-sm font-medium text-accent-600">Pacientes por avisar</h2>
          <ul className="space-y-2">
            {pacientesPorAvisar.map((item) => {
              if (item.kind === "cita") {
                const a = item.appointment;
                const name = a.particular_label ?? (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "—");
                const phone = a.patients?.phone;
                return (
                  <li key={`cita-${a.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                    <Link href={`/citas/${a.id}`} className="flex-1">
                      <span className="block text-sm text-slate-900">{name}</span>
                      <span className="block text-xs text-slate-500">
                        {agendaLabel(a.agenda)} · {formatDateEs(a.date, { day: "numeric", month: "short" })}
                        {a.start_time ? ` · ${formatTimeEs(a.start_time)}` : ""}
                        {phone ? ` · ${phone}` : ""}
                      </span>
                    </Link>
                    {phone && (
                      <WhatsappButton
                        onMarkSent={markWhatsappSentAction.bind(null, a.id)}
                        phone={phone}
                        sentAt={a.whatsapp_sent_at}
                        urgency={reminderUrgency(hoursUntilAppointment(a.date, a.start_time))}
                        message={buildReminderMessage({
                          patientFirstName: a.patients?.first_name ?? name,
                          agendaLabel: agendaLabel(a.agenda),
                          dateLabel: formatDateEs(a.date, { weekday: "long", day: "numeric", month: "long" }),
                          timeLabel: a.start_time ? formatTimeEs(a.start_time) : null,
                        })}
                      />
                    )}
                  </li>
                );
              }

              const c = item.candidato;
              const name = c.particular_label ?? (c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "—");
              const phone = c.patients?.phone;
              return (
                <li key={`candidato-${c.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                  <Link href="/agenda/quirofano/candidatos" className="flex-1">
                    <span className="block text-sm text-slate-900">{name}</span>
                    <span className="block text-xs text-slate-500">
                      Candidato quirófano · fecha deseada {formatDateEs(c.desired_date!, { day: "numeric", month: "short" })}
                      {phone ? ` · ${phone}` : ""}
                    </span>
                  </Link>
                  {phone && (
                    <WhatsappButton
                      onMarkSent={markCandidatoWhatsappSentAction.bind(null, c.id)}
                      phone={phone}
                      sentAt={c.whatsapp_sent_at}
                      message={`Hola ${c.patients ? c.patients.first_name : name}, le llamamos de traumatología para concretar la fecha de su intervención de quirófano. ¿Podría confirmarnos disponibilidad? Gracias.`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {recordatoriosManana.pendientes.length > 0 && (
        <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50 p-3">
          <h2 className="text-sm font-medium text-brand-700">
            Recordatorios de mañana ({recordatoriosManana.pendientes.length} de {recordatoriosManana.total} por avisar)
          </h2>
          <ul className="space-y-2">
            {recordatoriosManana.pendientes.map((a) => {
              const name = a.particular_label ?? (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "—");
              const phone = a.patients!.phone;
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                  <Link href={`/citas/${a.id}`} className="flex-1">
                    <span className="block text-sm text-slate-900">{name}</span>
                    <span className="block text-xs text-slate-500">
                      {agendaLabel(a.agenda)}
                      {a.start_time ? ` · ${formatTimeEs(a.start_time)}` : ""} · {phone}
                    </span>
                  </Link>
                  <WhatsappButton
                    onMarkSent={markWhatsappSentAction.bind(null, a.id)}
                    phone={phone}
                    sentAt={a.whatsapp_sent_at}
                    urgency={reminderUrgency(hoursUntilAppointment(a.date, a.start_time))}
                    message={buildReminderMessage({
                      patientFirstName: a.patients?.first_name ?? name,
                      agendaLabel: agendaLabel(a.agenda),
                      dateLabel: formatDateEs(a.date, { weekday: "long", day: "numeric", month: "long" }),
                      timeLabel: a.start_time ? formatTimeEs(a.start_time) : null,
                    })}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-slate-700">Huecos libres — {formatDateEs(date, { day: "numeric", month: "long" })}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {AGENDAS.map((agenda) => {
            const colors = AGENDA_COLORS[agenda.value];
            const isEnfermeria = agenda.value === "enfermeria";
            const dayRow = dayRows?.find((d) => d.agenda === agenda.value);
            const config = configs?.find((c) => c.agenda === agenda.value);
            const { isOpen, slots } = isEnfermeria
              ? { isOpen: enfermeriaOpen, slots: [] }
              : freeSlotsFor(agenda.value, dayRow, config, dayAppointments ?? []);

            return (
              <div key={agenda.value} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <span className="text-sm font-medium text-slate-900">{agenda.label}</span>
                </div>
                {!isOpen ? (
                  <p className="text-xs text-slate-400">Día cerrado</p>
                ) : isEnfermeria ? (
                  <Link
                    href={`/citas/nueva?agenda=enfermeria&fecha=${date}`}
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${colors.badge}`}
                  >
                    + Nueva cita
                  </Link>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin huecos libres</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map((slot) => (
                      <Link
                        key={slot}
                        href={`/citas/nueva?agenda=${agenda.value}&fecha=${date}&hora=${slot}`}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium hover:opacity-80 ${colors.badge}`}
                      >
                        {slot}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Link
        href="/estadisticas"
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
      >
        <span>
          <span className="block font-medium text-slate-900">Cuadro de mandos</span>
          <span className="block text-sm text-slate-500">Ocupación, ratios por compañía, enfermería y quirófano.</span>
        </span>
        <span className="text-slate-400">→</span>
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <Link
            href={`/?mes=${formatYearMonthParam(prevMonth.year, prevMonth.month)}`}
            className="whitespace-nowrap text-sm text-slate-500 hover:text-slate-900"
          >
            ← Anterior
          </Link>
          <p className="text-center text-sm font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</p>
          <Link
            href={`/?mes=${formatYearMonthParam(nextMonth.year, nextMonth.month)}`}
            className="whitespace-nowrap text-sm text-slate-500 hover:text-slate-900"
          >
            Siguiente →
          </Link>
        </div>
        <p className="text-center text-xs text-slate-400">Los puntos de color indican qué agendas tienen consulta (día abierto) ese día.</p>
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
                      isSelected ? "ring-2 ring-brand-600" : isToday ? "ring-2 ring-accent-500" : ""
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
                        <span className="block text-xs text-slate-500">
                          {a.insurance_companies?.name ?? "Particular"}
                          {a.patients?.phone ? ` · ${a.patients.phone}` : ""}
                        </span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(a.status)}`}>
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
