import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateEs, formatTimeEs, hoursUntilAppointment } from "@/lib/domain/dates";
import { generateSlotStarts, isSlotFree, timeToMinutes, type OccupiedInterval } from "@/lib/domain/slots";
import { agendaLabel, reminderUrgency, statusLabel, statusStyle } from "@/lib/domain/agendas";
import { buildReminderMessage } from "@/lib/domain/whatsapp";
import { markWhatsappSentAction } from "@/lib/actions/appointments";
import { WhatsappButton } from "@/app/(app)/_components/whatsapp-button";
import type { AgendaType } from "@/lib/supabase/database.types";

export async function DayView({ agenda, date }: { agenda: AgendaType; date: string }) {
  const supabase = await createClient();
  const isEnfermeria = agenda === "enfermeria";

  const [{ data: dayRow }, { data: config }, { data: appointments }] = await Promise.all([
    supabase
      .from("agenda_days")
      .select("is_open, start_time_override, end_time_override")
      .eq("agenda", agenda)
      .eq("date", date)
      .maybeSingle(),
    supabase.from("agenda_config").select("start_time, end_time, default_duration_minutes").eq("agenda", agenda).single(),
    supabase
      .from("appointments")
      .select("*, patients(first_name, last_name, phone), insurance_companies(name), appointment_types(name)")
      .eq("agenda", agenda)
      .eq("date", date)
      .order("start_time", { nullsFirst: true })
      .order("created_at"),
  ]);

  const isOpen = dayRow?.is_open ?? false;

  if (!isOpen && (appointments ?? []).length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="font-medium text-slate-700">Día cerrado</p>
        <p className="text-sm text-slate-500">No hay consulta programada este día para esta agenda.</p>
      </div>
    );
  }

  type Appointment = NonNullable<typeof appointments>[number];

  // Botón de avisar/recordar por WhatsApp: aparece en cualquier cita con teléfono que no esté
  // cancelada ni completada, coloreado según lo cerca que esté (rojo <48h, amarillo 48h-4 días,
  // verde +4 días). Al pulsarlo, si la cita estaba "confirmada sin avisar" pasa sola a "confirmada/avisada".
  function whatsappButtonFor(a: Appointment) {
    const phone = a.patients?.phone ?? a.particular_phone;
    const canNotify = !!phone && a.status !== "cancelada" && a.status !== "completada";
    if (!canNotify || !phone) return null;
    return (
      <WhatsappButton
        onMarkSent={markWhatsappSentAction.bind(null, a.id)}
        phone={phone}
        sentAt={a.whatsapp_sent_at}
        urgency={reminderUrgency(hoursUntilAppointment(a.date, a.start_time))}
        message={buildReminderMessage({
          patientFirstName: a.patients?.first_name ?? a.particular_label ?? "paciente",
          agendaLabel: agendaLabel(agenda),
          dateLabel: formatDateEs(a.date, { weekday: "long", day: "numeric", month: "long" }),
          timeLabel: a.start_time ? formatTimeEs(a.start_time) : null,
        })}
      />
    );
  }

  if (isEnfermeria) {
    return (
      <div className="space-y-2">
        {!isOpen && (
          <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-600">
            Este día está marcado como cerrado, pero tiene citas registradas.
          </p>
        )}

        <ul className="space-y-2">
          {(appointments ?? []).map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
            >
              <Link href={`/citas/${a.id}`} className="flex flex-1 items-center gap-3">
                <span className="flex-1">
                  <span className="block text-slate-900">
                    {a.particular_label ?? (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "—")}
                  </span>
                  <span className="block text-sm text-slate-500">
                    {a.insurance_companies?.name ?? "Particular"}
                    {a.appointment_types?.name ? ` · ${a.appointment_types.name}` : ""}
                    {" · "}
                    {a.patients?.phone ?? a.particular_phone ?? "—"}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(a.status)}`}>
                  {statusLabel(a.status)}
                </span>
              </Link>
              {whatsappButtonFor(a)}
            </li>
          ))}
          {(appointments ?? []).length === 0 && <p className="text-sm text-slate-500">Sin citas este día.</p>}
        </ul>

        {isOpen && (
          <Link
            href={`/citas/nueva?agenda=${agenda}&fecha=${date}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            + Nueva cita
          </Link>
        )}
      </div>
    );
  }

  const occupied: OccupiedInterval[] = (appointments ?? [])
    .filter((a) => a.status !== "cancelada" && a.start_time && a.duration_minutes)
    .map((a) => ({
      start: timeToMinutes(a.start_time!.slice(0, 5)),
      end: timeToMinutes(a.start_time!.slice(0, 5)) + a.duration_minutes!,
    }));

  const jornadaStart = (dayRow?.start_time_override ?? config?.start_time)?.slice(0, 5);
  const jornadaEnd = (dayRow?.end_time_override ?? config?.end_time)?.slice(0, 5);

  const freeSlots =
    isOpen && config && jornadaStart && jornadaEnd
      ? generateSlotStarts(jornadaStart, jornadaEnd, config.default_duration_minutes).filter((slot) =>
          isSlotFree(slot, config.default_duration_minutes, occupied),
        )
      : [];

  type TimelineItem =
    | { kind: "appointment"; time: string; appointment: Appointment }
    | { kind: "free"; time: string };

  const items: TimelineItem[] = [
    ...(appointments ?? []).map((a) => ({ kind: "appointment" as const, time: (a.start_time ?? "").slice(0, 5), appointment: a })),
    ...freeSlots.map((time) => ({ kind: "free" as const, time })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-2">
      {!isOpen && (
        <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-600">
          Este día está marcado como cerrado, pero tiene citas registradas.
        </p>
      )}

      {items.length === 0 && <p className="text-sm text-slate-500">Sin huecos configurados para esta jornada.</p>}

      <ul className="space-y-2">
        {items.map((item) =>
          item.kind === "free" ? (
            <li key={`free-${item.time}`}>
              <Link
                href={`/citas/nueva?agenda=${agenda}&fecha=${date}&hora=${item.time}`}
                className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-slate-500 hover:border-slate-400 hover:text-slate-700"
              >
                <span className="w-12 font-medium">{item.time}</span>
                <span className="text-sm">+ Nueva cita</span>
              </Link>
            </li>
          ) : (
            <li
              key={item.appointment.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
            >
              <Link href={`/citas/${item.appointment.id}`} className="flex flex-1 items-center gap-3">
                <span className="w-12 font-medium text-slate-900">
                  {item.appointment.start_time ? formatTimeEs(item.appointment.start_time) : "—"}
                </span>
                <span className="flex-1">
                  <span className="block text-slate-900">
                    {item.appointment.particular_label ??
                      (item.appointment.patients
                        ? `${item.appointment.patients.first_name} ${item.appointment.patients.last_name}`
                        : "—")}
                  </span>
                  <span className="block text-sm text-slate-500">
                    {item.appointment.insurance_companies?.name ?? "Particular"}
                    {item.appointment.appointment_types?.name ? ` · ${item.appointment.appointment_types.name}` : ""}
                    {" · "}
                    {item.appointment.patients?.phone ?? item.appointment.particular_phone ?? "—"}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(item.appointment.status)}`}>
                  {statusLabel(item.appointment.status)}
                </span>
              </Link>
              {whatsappButtonFor(item.appointment)}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
