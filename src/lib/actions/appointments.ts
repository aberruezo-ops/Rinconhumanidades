"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isAgendaType, normalizeStatus } from "@/lib/domain/agendas";
import { findOverlap, timeToMinutes } from "@/lib/domain/slots";
import type { AgendaType, AppointmentStatus } from "@/lib/supabase/database.types";

const STATUSES: AppointmentStatus[] = [
  "confirmada_sin_avisar",
  "confirmada_avisada",
  "completada",
  "no_presentado",
  "cancelada",
  "pendiente",
];

const formSchema = z.object({
  agenda: z.string().refine(isAgendaType),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  patient_mode: z.enum(["registrado", "particular"]),
  patient_id: z.string().optional(),
  new_first_name: z.string().optional(),
  new_last_name: z.string().optional(),
  new_phone: z.string().optional(),
  particular_label: z.string().optional(),
  insurance_company_id: z.string().optional(),
  appointment_type_id: z.string().optional(),
  status: z.string().refine((s): s is AppointmentStatus => STATUSES.includes(s as AppointmentStatus)),
  pathology: z.string().optional(),
  prosthesis_brand: z.string().optional(),
  dni: z.string().optional(),
  observations: z.string().optional(),
});

export type AppointmentFormState = { error?: string } | undefined;

function readForm(formData: FormData) {
  const parsed = formSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return null;
  return parsed.data;
}

async function resolvePatient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: NonNullable<ReturnType<typeof readForm>>,
): Promise<{ patientId: string | null; particularLabel: string | null; error?: string }> {
  if (data.patient_mode === "particular") {
    return {
      patientId: null,
      particularLabel: data.particular_label?.trim() || (data.start_time ? `Particular ${data.start_time}` : "Particular"),
    };
  }

  if (data.patient_id) {
    return { patientId: data.patient_id, particularLabel: null };
  }

  const firstName = data.new_first_name?.trim();
  const lastName = data.new_last_name?.trim();
  const phone = data.new_phone?.trim();

  if (!firstName || !lastName || !phone) {
    return { patientId: null, particularLabel: null, error: "Busca un paciente existente o rellena nombre, apellidos y teléfono para registrar uno nuevo." };
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone,
      insurance_company_id: data.insurance_company_id || null,
      dni: data.agenda === "quirofano" ? data.dni?.trim() || null : null,
    })
    .select("id")
    .single();

  if (error || !patient) {
    return { patientId: null, particularLabel: null, error: "No se ha podido registrar el paciente." };
  }

  return { patientId: patient.id, particularLabel: null };
}

async function checkDayOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agenda: AgendaType,
  date: string,
): Promise<boolean> {
  const { data } = await supabase.from("agenda_days").select("is_open").eq("agenda", agenda).eq("date", date).single();
  return data?.is_open ?? false;
}

// Enfermería no tiene hora (solo día); el resto de agendas exigen hora de inicio y fin,
// de las que se calcula la duración.
function resolveTimeFields(
  agenda: AgendaType,
  data: { start_time?: string; end_time?: string },
): { startTime: string | null; durationMinutes: number | null; error?: string } {
  if (agenda === "enfermeria") {
    return { startTime: null, durationMinutes: null };
  }

  if (!data.start_time || !data.end_time) {
    return { startTime: null, durationMinutes: null, error: "Indica la hora de inicio y de fin." };
  }

  const durationMinutes = timeToMinutes(data.end_time) - timeToMinutes(data.start_time);
  if (durationMinutes <= 0) {
    return { startTime: null, durationMinutes: null, error: "La hora de fin debe ser posterior a la de inicio." };
  }

  return { startTime: data.start_time, durationMinutes };
}

export async function checkOverlapAction(
  agenda: AgendaType,
  date: string,
  startTime: string | null,
  durationMinutes: number | null,
  excludeId?: string,
): Promise<string | null> {
  // Enfermería no tiene hora: no hay solape que comprobar.
  if (agenda === "enfermeria" || !startTime || !durationMinutes) return null;

  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select("id, start_time, duration_minutes, particular_label, patient_id, patients(first_name, last_name)")
    .eq("agenda", agenda)
    .eq("date", date)
    .neq("status", "cancelada");

  const occupied = (data ?? [])
    .filter((a) => a.id !== excludeId && a.start_time && a.duration_minutes)
    .map((a) => ({
      start: timeToMinutes(a.start_time!.slice(0, 5)),
      end: timeToMinutes(a.start_time!.slice(0, 5)) + a.duration_minutes!,
      label: a.particular_label ?? (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "cita"),
    }));

  const conflict = findOverlap(startTime, durationMinutes, occupied);
  if (!conflict) return null;
  const match = occupied.find((o) => o.start === conflict.start);
  return `Se solapa con la cita de las ${startTime.slice(0, 2)}:${startTime.slice(3, 5)} (${match?.label ?? "otra cita"}).`;
}

export async function createAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const user = await requireUser();
  requireAdmin(user);
  const data = readForm(formData);
  if (!data) return { error: "Revisa los datos del formulario." };

  const agenda = data.agenda as AgendaType;

  if (data.status === "pendiente" && agenda !== "quirofano") {
    return { error: "El estado \"pendiente\" solo existe en quirófano." };
  }

  const supabase = await createClient();

  const dayOpen = await checkDayOpen(supabase, agenda, data.date);
  if (!dayOpen) {
    return { error: "Ese día está cerrado para esta agenda. Ábrelo primero desde el backoffice." };
  }

  const { startTime, durationMinutes, error: timeError } = resolveTimeFields(agenda, data);
  if (timeError) return { error: timeError };

  const { patientId, particularLabel, error: patientError } = await resolvePatient(supabase, data);
  if (patientError) return { error: patientError };

  const isQuirofano = agenda === "quirofano";

  const { error } = await supabase.from("appointments").insert({
    agenda,
    date: data.date,
    start_time: startTime,
    duration_minutes: durationMinutes,
    patient_id: patientId,
    particular_label: particularLabel,
    insurance_company_id: data.insurance_company_id || null,
    appointment_type_id: agenda === "enfermeria" ? data.appointment_type_id || null : null,
    status: data.status,
    pathology: isQuirofano ? data.pathology?.trim() || null : null,
    prosthesis_brand: isQuirofano ? data.prosthesis_brand?.trim() || null : null,
    dni: isQuirofano ? data.dni?.trim() || null : null,
    observations: data.observations?.trim() || null,
  });

  if (error) {
    if (error.code === "23P01") {
      return { error: "Esa franja ya está ocupada por otra cita." };
    }
    return { error: "No se ha podido guardar la cita." };
  }

  revalidatePath(`/agenda/${agenda}`);
  redirect(`/agenda/${agenda}?fecha=${data.date}`);
}

export async function updateAppointmentAction(
  id: string,
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const user = await requireUser();
  requireAdmin(user);
  const data = readForm(formData);
  if (!data) return { error: "Revisa los datos del formulario." };

  const agenda = data.agenda as AgendaType;

  if (data.status === "pendiente" && agenda !== "quirofano") {
    return { error: "El estado \"pendiente\" solo existe en quirófano." };
  }

  const supabase = await createClient();

  const dayOpen = await checkDayOpen(supabase, agenda, data.date);
  if (!dayOpen) {
    return { error: "Ese día está cerrado para esta agenda. Ábrelo primero desde el backoffice." };
  }

  const { startTime, durationMinutes, error: timeError } = resolveTimeFields(agenda, data);
  if (timeError) return { error: timeError };

  const { patientId, particularLabel, error: patientError } = await resolvePatient(supabase, data);
  if (patientError) return { error: patientError };

  const isQuirofano = agenda === "quirofano";

  const { error } = await supabase
    .from("appointments")
    .update({
      agenda,
      date: data.date,
      start_time: startTime,
      duration_minutes: durationMinutes,
      patient_id: patientId,
      particular_label: particularLabel,
      insurance_company_id: data.insurance_company_id || null,
      appointment_type_id: agenda === "enfermeria" ? data.appointment_type_id || null : null,
      status: data.status,
      pathology: isQuirofano ? data.pathology?.trim() || null : null,
      prosthesis_brand: isQuirofano ? data.prosthesis_brand?.trim() || null : null,
      dni: isQuirofano ? data.dni?.trim() || null : null,
      observations: data.observations?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23P01") {
      return { error: "Esa franja ya está ocupada por otra cita." };
    }
    return { error: "No se ha podido guardar la cita." };
  }

  revalidatePath(`/agenda/${agenda}`);
  redirect(`/agenda/${agenda}?fecha=${data.date}`);
}

export async function cancelAppointmentAction(id: string, agenda: AgendaType, date: string) {
  const user = await requireUser();
  requireAdmin(user);
  const supabase = await createClient();
  await supabase.from("appointments").update({ status: "cancelada" }).eq("id", id);
  revalidatePath(`/agenda/${agenda}`);
  redirect(`/agenda/${agenda}?fecha=${date}`);
}

export async function markWhatsappSentAction(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  requireAdmin(user);
  const supabase = await createClient();

  // Al avisar, la cita pasa a "confirmada/avisada" (también si la fila seguía con un estado
  // antiguo sin migrar como "programada" o "avisado": se normaliza en el mismo gesto).
  const { data: current } = await supabase.from("appointments").select("status").eq("id", id).single();
  const update: { whatsapp_sent_at: string; status?: AppointmentStatus } = { whatsapp_sent_at: new Date().toISOString() };
  if (current && ["confirmada_sin_avisar", "confirmada_avisada"].includes(normalizeStatus(current.status))) {
    update.status = "confirmada_avisada";
  }

  const { error } = await supabase.from("appointments").update(update).eq("id", id);
  if (error) return { error: "No se ha podido registrar el aviso." };
  revalidatePath("/listados");
  revalidatePath("/");
  return {};
}
