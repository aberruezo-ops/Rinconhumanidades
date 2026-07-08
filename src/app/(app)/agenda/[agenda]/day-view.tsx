import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTimeEs } from "@/lib/domain/dates";
import { generateSlotStarts, isSlotFree, timeToMinutes, type OccupiedInterval } from "@/lib/domain/slots";
import { statusLabel, STATUS_STYLES } from "@/lib/domain/agendas";
import type { AgendaType } from "@/lib/supabase/database.types";

export async function DayView({ agenda, date }: { agenda: AgendaType; date: string }) {
  const supabase = await createClient();

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
      .select("*, patients(first_name, last_name), insurance_companies(name), appointment_types(name)")
      .eq("agenda", agenda)
      .eq("date", date)
      .order("start_time"),
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

  const occupied: OccupiedInterval[] = (appointments ?? [])
    .filter((a) => a.status !== "cancelada")
    .map((a) => ({
      start: timeToMinutes(a.start_time.slice(0, 5)),
      end: timeToMinutes(a.start_time.slice(0, 5)) + a.duration_minutes,
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
    | { kind: "appointment"; time: string; appointment: NonNullable<typeof appointments>[number] }
    | { kind: "free"; time: string };

  const items: TimelineItem[] = [
    ...(appointments ?? []).map((a) => ({ kind: "appointment" as const, time: a.start_time.slice(0, 5), appointment: a })),
    ...freeSlots.map((time) => ({ kind: "free" as const, time })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-2">
      {!isOpen && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
            <li key={item.appointment.id}>
              <Link
                href={`/citas/${item.appointment.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
              >
                <span className="w-12 font-medium text-slate-900">{formatTimeEs(item.appointment.start_time)}</span>
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
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.appointment.status]}`}>
                  {statusLabel(item.appointment.status)}
                </span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
