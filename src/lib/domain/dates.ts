// Todas las fechas se tratan como fechas de calendario "YYYY-MM-DD", nunca como instantes.
// Se usa Date.UTC/getUTCDay a propósito: es la única forma de calcular el día de la
// semana de una fecha de calendario sin que el huso horario del servidor la desplace un día.

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// 1 = lunes … 7 = domingo (para que coincida con agenda_config.default_weekdays)
export function isoWeekday(year: number, month: number, day: number): number {
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = domingo … 6 = sábado
  return jsDay === 0 ? 7 : jsDay;
}

export function parseYearMonth(value: string | undefined, fallback: { year: number; month: number }) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return fallback;
  return { year, month };
}

export function shiftYearMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function formatYearMonthParam(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function todayYmd(): string {
  const now = new Date();
  return ymd(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function monthLabelEs(year: number, month: number): string {
  return `${MONTH_NAMES_ES[month - 1]} ${year}`;
}

export function formatDateEs(dateStr: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return date.toLocaleDateString("es-ES", { ...opts, timeZone: "UTC" });
}

export function formatTimeEs(timeStr: string): string {
  // "HH:MM:SS" -> "HH:MM"
  return timeStr.slice(0, 5);
}

export type MonthCell = { day: number; date: string } | null;

// Semanas de lunes a domingo, con huecos (null) para completar la primera y la última semana.
export function buildMonthWeeks(year: number, month: number): MonthCell[][] {
  const total = daysInMonth(year, month);
  const cells: MonthCell[] = [];

  const leadingBlanks = isoWeekday(year, month, 1) - 1;
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= total; day++) cells.push({ day, date: ymd(year, month, day) });
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
