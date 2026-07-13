import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAgendaType, agendaLabel, DEFAULT_NEW_APPOINTMENT_STATUS } from "@/lib/domain/agendas";
import { todayYmd } from "@/lib/domain/dates";
import { createAppointmentAction } from "@/lib/actions/appointments";
import { minutesToTime, normalizeTimeInput, timeToMinutes } from "@/lib/domain/slots";
import { AppointmentForm } from "../_components/appointment-form";
import type { AgendaType } from "@/lib/supabase/database.types";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ agenda?: string; fecha?: string; hora?: string }>;
}) {
  const user = await requireUser();
  requireAdmin(user);

  const { agenda: agendaParam, fecha, hora } = await searchParams;
  if (!agendaParam || !isAgendaType(agendaParam)) notFound();
  const agenda: AgendaType = agendaParam;

  const supabase = await createClient();
  const [{ data: companies }, { data: types }, { data: config }, { data: dayRow }] = await Promise.all([
    supabase.from("insurance_companies").select("id, name, duration_minutes").eq("active", true).order("name"),
    supabase
      .from("appointment_types")
      .select("id, name, default_duration_minutes")
      .eq("agenda", "enfermeria")
      .eq("active", true)
      .order("name"),
    supabase.from("agenda_config").select("default_duration_minutes, start_time").eq("agenda", agenda).single(),
    fecha
      ? supabase.from("agenda_days").select("start_time_override").eq("agenda", agenda).eq("date", fecha).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isEnfermeria = agenda === "enfermeria";
  const startTime = isEnfermeria
    ? ""
    : normalizeTimeInput(hora) ||
      normalizeTimeInput(dayRow?.start_time_override) ||
      normalizeTimeInput(config?.start_time) ||
      "09:00";
  const endTime =
    isEnfermeria || !startTime
      ? ""
      : minutesToTime(timeToMinutes(startTime) + (config?.default_duration_minutes ?? 15));

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Nueva cita — {agendaLabel(agenda)}</h1>
      <AppointmentForm
        agenda={agenda}
        action={createAppointmentAction}
        insuranceCompanies={companies ?? []}
        appointmentTypes={types ?? []}
        agendaDefaultDurationMinutes={config?.default_duration_minutes ?? 15}
        defaults={{
          date: fecha ?? todayYmd(),
          start_time: startTime,
          end_time: endTime,
          patient: null,
          particular_label: "",
          particular_phone: "",
          insurance_company_id: "",
          appointment_type_id: "",
          status: DEFAULT_NEW_APPOINTMENT_STATUS,
          pathology: "",
          prosthesis_brand: "",
          dni: "",
          observations: "",
        }}
      />
    </div>
  );
}
