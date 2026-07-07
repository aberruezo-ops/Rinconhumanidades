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

// "pendiente" (pre-reserva a la espera de confirmación) solo existe en quirófano
export function statusesForAgenda(agenda: AgendaType) {
  return agenda === "quirofano" ? APPOINTMENT_STATUSES : APPOINTMENT_STATUSES.filter((s) => s.value !== "pendiente");
}

export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  programada: "bg-sky-100 text-sky-800",
  confirmada: "bg-blue-100 text-blue-800",
  completada: "bg-slate-200 text-slate-600",
  no_presentado: "bg-amber-100 text-amber-800",
  cancelada: "bg-red-100 text-red-700 line-through",
  pendiente: "bg-purple-100 text-purple-800",
};

export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// 1 = lunes … 7 = domingo, para que coincida con agenda_config.default_weekdays
export function weekdayLabel(isoWeekday: number): string {
  return WEEKDAY_LABELS[isoWeekday - 1] ?? "";
}
