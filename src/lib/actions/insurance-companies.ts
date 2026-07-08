"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";

export type CompanyFormState = { error?: string } | undefined;

const nameSchema = z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.");

export async function createInsuranceCompanyAction(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const user = await requireUser();
  requireAdmin(user);

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nombre no válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("insurance_companies").insert({ name: parsed.data });

  if (error) {
    return { error: error.code === "23505" ? "Ya existe una compañía con ese nombre." : "No se ha podido guardar." };
  }

  revalidatePath("/backoffice/aseguradoras");
  return undefined;
}

export async function toggleInsuranceCompanyAction(id: string, active: boolean) {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  await supabase.from("insurance_companies").update({ active }).eq("id", id);

  revalidatePath("/backoffice/aseguradoras");
}

export type DurationFormState = { error?: string } | undefined;

const durationSchema = z.object({
  duration_mode: z.enum(["default", "custom"]),
  duration_minutes: z.coerce.number().int().min(5).max(240).optional(),
});

export async function updateInsuranceCompanyDurationAction(
  id: string,
  _prevState: DurationFormState,
  formData: FormData,
): Promise<DurationFormState> {
  const user = await requireUser();
  requireAdmin(user);

  const parsed = durationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Indica una duración entre 5 y 240 minutos." };
  }

  const durationMinutes = parsed.data.duration_mode === "custom" ? (parsed.data.duration_minutes ?? null) : null;
  if (parsed.data.duration_mode === "custom" && durationMinutes === null) {
    return { error: "Indica cuántos minutos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("insurance_companies").update({ duration_minutes: durationMinutes }).eq("id", id);
  if (error) return { error: "No se ha podido guardar." };

  revalidatePath("/backoffice/aseguradoras");
  return undefined;
}
