import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agendaLabel, normalizeStatus } from "@/lib/domain/agendas";
import { updateAppointmentAction, cancelAppointmentAction } from "@/lib/actions/appointments";
import { minutesToTime, normalizeTimeInput, timeToMinutes } from "@/lib/domain/slots";
import { AppointmentForm } from "../_components/appointment-form";
import { ConfirmSubmitButton } from "@/app/(app)/_components/confirm-submit-button";

export default async function EditarCitaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  requireAdmin(user);

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: appointment }, { data: companies }, { data: types }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, patients(id, first_name, last_name, phone)")
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

  const startTime = normalizeTimeInput(appointment.start_time);
  const endTime =
    startTime && appointment.duration_minutes
      ? minutesToTime(timeToMinutes(startTime) + appointment.duration_minutes)
      : "";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Editar cita — {agendaLabel(appointment.agenda)}</h1>
        {appointment.status !== "cancelada" && (
          <form action={boundCancel}>
            <ConfirmSubmitButton
              confirmMessage="¿Cancelar esta cita? El paciente dejará de estar citado en ese hueco."
              className="text-sm text-red-600 hover:underline"
            >
              Cancelar cita
            </ConfirmSubmitButton>
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
            ? {
                id: appointment.patients.id,
                label: `${appointment.patients.first_name} ${appointment.patients.last_name}`,
                phone: appointment.patients.phone,
              }
            : null,
          particular_label: appointment.particular_label ?? "",
          particular_phone: appointment.particular_phone ?? "",
          insurance_company_id: appointment.insurance_company_id ?? "",
          appointment_type_id: appointment.appointment_type_id ?? "",
          status: normalizeStatus(appointment.status),
          pathology: appointment.pathology ?? "",
          prosthesis_brand: appointment.prosthesis_brand ?? "",
          dni: appointment.dni ?? "",
          observations: appointment.observations ?? "",
        }}
      />
    </div>
  );
}
