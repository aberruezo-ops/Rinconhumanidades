"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import type { AgendaType } from "@/lib/supabase/database.types";
import { daysInMonth, isoWeekday, ymd } from "@/lib/domain/dates";

// Guarda el horario de una semana completa de una tacada: los días marcados quedan
// abiertos con la hora indicada; el resto de días de esa semana quedan cerrados (sin
// horario especial). Así se configura "qué día(s) y a qué hora" semana a semana en vez
// de ir fecha a fecha.
export async function saveWeekAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user);

  const agenda = String(formData.get("agenda") ?? "") as AgendaType;
  const weekDates = JSON.parse(String(formData.get("week_dates") ?? "[]")) as string[];
  const selectedDates = new Set(formData.getAll("selected_dates").map(String));
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");

  if (selectedDates.size > 0 && (!startTime || !endTime || startTime >= endTime)) {
    throw new Error("Revisa que la hora de inicio sea anterior a la de fin.");
  }

  const rows = weekDates.map((date) =>
    selectedDates.has(date)
      ? { agenda, date, is_open: true, start_time_override: startTime, end_time_override: endTime }
      : { agenda, date, is_open: false, start_time_override: null, end_time_override: null },
  );

  const supabase = await createClient();
  const { error } = await supabase.from("agenda_days").upsert(rows, { onConflict: "agenda,date" });
  if (error) {
    throw new Error("No se ha podido guardar la semana.");
  }

  revalidatePath(`/backoffice/dias/${agenda}`);
  revalidatePath(`/agenda/${agenda}`);
}

// Abre todas las fechas del mes que caen en el patrón semanal por defecto de la agenda.
// No toca los días que ya tengan una decisión explícita en sentido contrario si el usuario
// los cerró después de programar el mes: se hace un upsert, así que reprogramar el mes
// vuelve a abrir cualquier día del patrón que se hubiera cerrado antes.
export async function scheduleMonthAction(agenda: AgendaType, year: number, month: number) {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("agenda_config")
    .select("default_weekdays")
    .eq("agenda", agenda)
    .single();

  const weekdays = new Set(config?.default_weekdays ?? []);
  if (weekdays.size === 0) {
    throw new Error("Esta agenda no tiene días por defecto configurados todavía.");
  }

  const total = daysInMonth(year, month);
  const rows = [];
  for (let day = 1; day <= total; day++) {
    if (weekdays.has(isoWeekday(year, month, day))) {
      rows.push({ agenda, date: ymd(year, month, day), is_open: true });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("agenda_days").upsert(rows, { onConflict: "agenda,date" });
    if (error) {
      throw new Error("No se ha podido programar el mes.");
    }
  }

  revalidatePath(`/backoffice/dias/${agenda}`);
  revalidatePath(`/agenda/${agenda}`);
}
