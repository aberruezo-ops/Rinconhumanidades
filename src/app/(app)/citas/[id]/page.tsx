import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agendaLabel } from "@/lib/domain/agendas";
import { updateAppointmentAction, cancelAppointmentAction } from "@/lib/actions/appointments";
import { minutesToTime, timeToMinutes } from "@/lib/domain/slots";
import { AppointmentForm } from "../_components/appointment-form";

export default async function EditarCitaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  requireAdmin(user);

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: appointment }, { data: companies }, { data: types }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, patients(id, first_name, last_name)")
      .eq("id", id)
      .single(),
    supabase.from("insurance_companies").select("id, name, duration_minutes").eq("active", true).order("name"),
    supabase
      .from("appointment_types")
      .select("id, name, default_duration_minutes")
      .eq("agenda", "enfermeria")
      .eq("active", true)
      .order("name"),
  ]);

  if (!appointment) notFound();

  const { data: agendaConfig } = await supabase
    .from("agenda_config")
    .select("default_duration_minutes")
    .eq("agenda", appointment.agenda)
    .single();

  const boundUpdate = updateAppointmentAction.bind(null, appointment.id);
  const boundCancel = cancelAppointmentAction.bind(null, appointment.id, appointment.agenda, appointment.date);

  const startTime = appointment.start_time?.slice(0, 5) ?? "";
  const endTime =
    appointment.start_time && appointment.duration_minutes
      ? minutesToTime(timeToMinutes(appointment.start_time.slice(0, 5)) + appointment.duration_minutes)
      : "";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Editar cita — {agendaLabel(appointment.agenda)}</h1>
        {appointment.status !== "cancelada" && (
          <form action={boundCancel}>
            <button type="submit" className="text-sm text-red-600 hover:underline">
              Cancelar cita
            </button>
          </form>
        )}
      </div>

      <AppointmentForm
        agenda={appointment.agenda}
        appointmentId={appointment.id}
        action={boundUpdate}
        insuranceCompanies={companies ?? []}
        appointmentTypes={types ?? []}
        agendaDefaultDurationMinutes={agendaConfig?.default_duration_minutes ?? 15}
        defaults={{
          date: appointment.date,
          start_time: startTime,
          end_time: endTime,
          patient: appointment.patients
            ? { id: appointment.patients.id, label: `${appointment.patients.first_name} ${appointment.patients.last_name}` }
            : null,
          particular_label: appointment.particular_label ?? "",
          insurance_company_id: appointment.insurance_company_id ?? "",
          appointment_type_id: appointment.appointment_type_id ?? "",
          status: appointment.status,
          pathology: appointment.pathology ?? "",
          prosthesis_brand: appointment.prosthesis_brand ?? "",
          dni: appointment.dni ?? "",
          observations: appointment.observations ?? "",
        }}
      />
    </div>
  );
}
