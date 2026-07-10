"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type PatientSearchResult = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  insurance_company_id: string | null;
  notes: string | null;
};

export async function searchPatientsAction(query: string): Promise<PatientSearchResult[]> {
  await requireUser();

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const escaped = trimmed.replace(/[%_]/g, (m) => `\\${m}`);
  const { data } = await supabase
    .from("patients")
    .select("id, first_name, last_name, phone, insurance_company_id, notes")
    .or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`)
    .order("last_name")
    .limit(8);

  return data ?? [];
}
