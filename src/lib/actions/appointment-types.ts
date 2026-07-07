"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";

export type AppointmentTypeFormState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  default_duration_minutes: z.coerce.number().int().min(5).max(240),
});

// Fase 1: el catálogo de tipos de cita solo se usa en la agenda de enfermería.
export async function createAppointmentTypeAction(
  _prevState: AppointmentTypeFormState,
  formData: FormData,
): Promise<AppointmentTypeFormState> {
  const user = await requireUser();
  requireAdmin(user);

  const parsed = schema.safeParse({
    name: formData.get("name"),
    default_duration_minutes: formData.get("default_duration_minutes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointment_types").insert({
    agenda: "enfermeria",
    name: parsed.data.name,
    default_duration_minutes: parsed.data.default_duration_minutes,
  });

  if (error) {
    return { error: error.code === "23505" ? "Ya existe un tipo de cita con ese nombre." : "No se ha podido guardar." };
  }

  revalidatePath("/backoffice/tipos-cita");
  return undefined;
}

export async function toggleAppointmentTypeAction(id: string, active: boolean) {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  await supabase.from("appointment_types").update({ active }).eq("id", id);

  revalidatePath("/backoffice/tipos-cita");
}
