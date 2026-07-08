"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";

export type CandidatoFormState = { error?: string } | undefined;

const formSchema = z.object({
  patient_mode: z.enum(["registrado", "particular"]),
  patient_id: z.string().optional(),
  particular_label: z.string().optional(),
  desired_date: z.string().optional(),
  observations: z.string().optional(),
});

export async function createCandidatoAction(
  _prevState: CandidatoFormState,
  formData: FormData,
): Promise<CandidatoFormState> {
  const user = await requireUser();
  requireAdmin(user);

  const parsed = formSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Revisa los datos del formulario." };
  const data = parsed.data;

  const patientId = data.patient_mode === "registrado" ? data.patient_id || null : null;
  const particularLabel = data.patient_mode === "particular" ? data.particular_label?.trim() || null : null;
  if (!patientId && !particularLabel) {
    return { error: "Busca un paciente registrado o indica un nombre para el candidato." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("quirofano_candidatos").insert({
    patient_id: patientId,
    particular_label: particularLabel,
    desired_date: data.desired_date || null,
    observations: data.observations?.trim() || null,
  });

  if (error) return { error: "No se ha podido guardar el candidato." };

  revalidatePath("/agenda/quirofano/candidatos");
  return undefined;
}

export async function markCandidatoWhatsappSentAction(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  requireAdmin(user);
  const supabase = await createClient();
  const { error } = await supabase
    .from("quirofano_candidatos")
    .update({ whatsapp_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "No se ha podido registrar el aviso." };
  revalidatePath("/agenda/quirofano/candidatos");
  revalidatePath("/");
  return {};
}

export async function markCandidatoConvertidoAction(id: string) {
  const user = await requireUser();
  requireAdmin(user);
  const supabase = await createClient();
  await supabase.from("quirofano_candidatos").update({ status: "convertido" }).eq("id", id);
  revalidatePath("/agenda/quirofano/candidatos");
  revalidatePath("/");
}

export async function discardCandidatoAction(id: string) {
  const user = await requireUser();
  requireAdmin(user);
  const supabase = await createClient();
  await supabase.from("quirofano_candidatos").update({ status: "descartado" }).eq("id", id);
  revalidatePath("/agenda/quirofano/candidatos");
  revalidatePath("/");
}
