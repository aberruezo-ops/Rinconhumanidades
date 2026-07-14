// Convierte un teléfono guardado en formato local (9 dígitos, España) al formato
// que espera wa.me (prefijo de país sin "+"). Si ya trae prefijo, se deja tal cual.
export function toWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `34${digits}`;
  return digits;
}

export function buildWhatsappLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsappPhone(phone)}?text=${encodeURIComponent(message)}`;
}

const DIRECCION_CONSULTA = "Paseo de la Estación, 58, escalera derecha, 3ºE";

export function buildReminderMessage(params: {
  patientFirstName: string;
  agendaLabel: string;
  dateLabel: string;
  timeLabel?: string | null;
}): string {
  const { patientFirstName, agendaLabel, dateLabel, timeLabel } = params;
  const horaTxt = timeLabel ? ` a las ${timeLabel}` : "";
  return `Hola ${patientFirstName}, le recordamos su cita de ${agendaLabel} el ${dateLabel}${horaTxt} en la consulta (${DIRECCION_CONSULTA}). Por favor, confirme su asistencia. Gracias.`;
}
