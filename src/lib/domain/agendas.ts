import type { AgendaType, AppointmentStatus } from "@/lib/supabase/database.types";

export const AGENDAS: { value: AgendaType; label: string; description: string }[] = [
  { value: "traumatologo", label: "Traumatología", description: "Consulta del traumatólogo" },
  { value: "enfermeria", label: "Enfermería", description: "Curas e infiltraciones" },
  { value: "quirofano", label: "Quirófano", description: "Cirugía programada" },
];

export function agendaLabel(agenda: AgendaType): string {
  return AGENDAS.find((a) => a.value === agenda)?.label ?? agenda;
}

export function isAgendaType(value: string): value is AgendaType {
  return AGENDAS.some((a) => a.value === value);
}

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: "programada", label: "Programada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "completada", label: "Completada" },
  { value: "no_presentado", label: "No presentado" },
  { value: "cancelada", label: "Cancelada" },
  { value: "pendiente", label: "Pendiente" },
];

export function statusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// 1 = lunes … 7 = domingo, para que coincida con agenda_config.default_weekdays
export function weekdayLabel(isoWeekday: number): string {
  return WEEKDAY_LABELS[isoWeekday - 1] ?? "";
}
