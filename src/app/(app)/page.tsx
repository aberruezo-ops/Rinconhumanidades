import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGENDAS, AGENDA_COLORS, agendaLabel, statusLabel, STATUS_STYLES } from "@/lib/domain/agendas";
import {
  buildMonthWeeks,
  daysBetween,
  formatDateEs,
  formatTimeEs,
  monthLabelEs,
  shiftYearMonth,
  todayYmd,
  ymd,
} from "@/lib/domain/dates";
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
      .eq("needs_reminder", true)
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  await requireUser();

  const supabase = await createClient();
  const today = todayYmd();
  const { fecha } = await searchParams;
  const explicitDate = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
  const date = explicitDate ?? (await resolveDefaultDate(supabase));
  const [year, month] = date.split("-").map(Number);

  const pacientesPorAvisar = await loadPacientesPorAvisar(supabase, today);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const [{ data: monthAgendaDays }, { data: dayAppointments }] = await Promise.all([
    supabase.from("agenda_days").select("date, agenda").eq("is_open", true).gte("date", from).lte("date", to),
    supabase
      .from("appointments")
      .select("*, patients(first_name, last_name), insurance_companies(name)")
      .eq("date", date)
      .order("start_time", { nullsFirst: true }),
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
                      </span>
                    </Link>
                    {phone && (
                      <WhatsappButton
                        onMarkSent={markWhatsappSentAction.bind(null, a.id)}
                        phone={phone}
                        sentAt={a.whatsapp_sent_at}
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

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <Link
            href={`/?fecha=${ymd(prevMonth.year, prevMonth.month, 1)}`}
            className="whitespace-nowrap text-sm text-slate-500 hover:text-slate-900"
          >
            ← Anterior
          </Link>
          <p className="text-center text-sm font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</p>
          <Link
            href={`/?fecha=${ymd(nextMonth.year, nextMonth.month, 1)}`}
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
