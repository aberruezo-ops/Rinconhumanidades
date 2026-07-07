"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isAgendaType } from "@/lib/domain/agendas";

const schema = z.object({
  agenda: z.string().refine(isAgendaType),
  default_weekdays: z.array(z.coerce.number().int().min(1).max(7)),
  default_duration_minutes: z.coerce.number().int().min(5).max(240),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  notice_days_default: z.coerce.number().int().min(0).max(90),
});

export type AgendaConfigState = { error?: string; ok?: boolean } | undefined;

export async function updateAgendaConfigAction(
  _prevState: AgendaConfigState,
  formData: FormData,
): Promise<AgendaConfigState> {
  const user = await requireUser();
  requireAdmin(user);

  const parsed = schema.safeParse({
    agenda: formData.get("agenda"),
    default_weekdays: formData.getAll("default_weekdays"),
    default_duration_minutes: formData.get("default_duration_minutes"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    notice_days_default: formData.get("notice_days_default"),
  });

  if (!parsed.success) {
    return { error: "Revisa los datos: hay algún campo con un valor no válido." };
  }

  if (parsed.data.start_time >= parsed.data.end_time) {
    return { error: "La hora de inicio de la jornada debe ser anterior a la hora de fin." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_config")
    .update({
      default_weekdays: parsed.data.default_weekdays,
      default_duration_minutes: parsed.data.default_duration_minutes,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      notice_days_default: parsed.data.notice_days_default,
    })
    .eq("agenda", parsed.data.agenda);

  if (error) {
    return { error: "No se ha podido guardar la configuración." };
  }

  revalidatePath("/backoffice/agendas");
  return { ok: true };
}
