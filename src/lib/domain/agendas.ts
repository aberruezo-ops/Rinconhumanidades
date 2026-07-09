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

// Un color por agenda para identificarlas de un vistazo (traumatología = morado,
// enfermería = verde azulado, quirófano = verde militar, como el de un uniforme de quirófano).
export const AGENDA_COLORS: Record<AgendaType, { badge: string; solid: string; dot: string; text: string; border: string }> = {
  traumatologo: {
    badge: "bg-trauma-100 text-trauma-700",
    solid: "bg-trauma-600 text-white",
    dot: "bg-trauma-600",
    text: "text-trauma-700",
    border: "border-trauma-600",
  },
  enfermeria: {
    badge: "bg-enfermeria-100 text-enfermeria-700",
    solid: "bg-enfermeria-600 text-white",
    dot: "bg-enfermeria-600",
    text: "text-enfermeria-700",
    border: "border-enfermeria-600",
  },
  quirofano: {
    badge: "bg-quirofano-100 text-quirofano-700",
    solid: "bg-quirofano-600 text-white",
    dot: "bg-quirofano-600",
    text: "text-quirofano-700",
    border: "border-quirofano-600",
  },
};

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: "confirmada_sin_avisar", label: "Confirmada sin avisar" },
  { value: "confirmada_avisada", label: "Confirmada/avisada" },
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

// Colores de estado, deliberadamente fuera de la gama morado/verde-azulado/verde militar
// que ya identifica a cada agenda, para no confundir "de qué agenda es" con "cómo va".
export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  confirmada_sin_avisar: "bg-brand-100 text-brand-700",
  confirmada_avisada: "bg-lime-100 text-lime-800",
  completada: "bg-slate-200 text-slate-600",
  no_presentado: "bg-amber-100 text-amber-800",
  cancelada: "bg-red-100 text-red-700 line-through",
  pendiente: "bg-accent-100 text-accent-600",
};

// Toda cita nueva empieza así: se avisará por WhatsApp a todo el mundo, y al avisar
// (botón de WhatsApp) pasa sola a "confirmada/avisada".
export const DEFAULT_NEW_APPOINTMENT_STATUS: AppointmentStatus = "confirmada_sin_avisar";

// Urgencia del botón de avisar por WhatsApp según cuánto falte para la cita.
export type ReminderUrgency = "green" | "yellow" | "red";

export function reminderUrgency(hoursUntil: number): ReminderUrgency {
  if (hoursUntil < 48) return "red";
  if (hoursUntil <= 96) return "yellow"; // 96h = 4 días
  return "green";
}

export const REMINDER_URGENCY_STYLES: Record<ReminderUrgency, string> = {
  green: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  yellow: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  red: "bg-red-100 text-red-700 hover:bg-red-200",
};

export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// 1 = lunes … 7 = domingo, para que coincida con agenda_config.default_weekdays
export function weekdayLabel(isoWeekday: number): string {
  return WEEKDAY_LABELS[isoWeekday - 1] ?? "";
}
