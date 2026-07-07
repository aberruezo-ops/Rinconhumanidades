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
