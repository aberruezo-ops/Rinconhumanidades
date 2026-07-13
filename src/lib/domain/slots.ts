// Un <input type="time"> solo acepta "HH:MM" exacto: si el valor recibido trae segundos,
// espacios u otro formato, el navegador lo descarta y el campo se ve vacío aunque el estado
// interno no lo esté. Se usa siempre que una hora venga de la base de datos o de la URL.
export function normalizeTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = value.trim().match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Huecos candidatos de la jornada, cada `stepMinutes` desde el inicio hasta que no quepa
// un hueco más antes del fin de jornada.
export function generateSlotStarts(startTime: string, endTime: string, stepMinutes: number): string[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const slots: string[] = [];
  for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

export type OccupiedInterval = { start: number; end: number };

export function isSlotFree(slotStart: string, stepMinutes: number, occupied: OccupiedInterval[]): boolean {
  const start = timeToMinutes(slotStart);
  const end = start + stepMinutes;
  return !occupied.some((o) => intervalsOverlap(start, end, o.start, o.end));
}

export function findOverlap(
  start: string,
  durationMinutes: number,
  occupied: OccupiedInterval[],
): OccupiedInterval | undefined {
  const s = timeToMinutes(start);
  const e = s + durationMinutes;
  return occupied.find((o) => intervalsOverlap(s, e, o.start, o.end));
}
