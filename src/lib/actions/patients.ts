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

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export async function searchPatientsAction(query: string): Promise<PatientSearchResult[]> {
  await requireUser();

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean).map(normalize);
  const supabase = await createClient();

  // Se trae la lista de pacientes (una sola clínica, volumen asumible) y se filtra aquí
  // ignorando acentos y mayúsculas: así "Garcia" encuentra a "García" y buscar "Apellido
  // Nombre" en cualquier orden también funciona, algo que un filtro ILIKE de Postgres
  // por columna no permite.
  const { data } = await supabase
    .from("patients")
    .select("id, first_name, last_name, phone, insurance_company_id, notes")
    .order("last_name")
    .limit(2000);

  if (!data) return [];

  const matches = data.filter((patient) => {
    const haystack = normalize(`${patient.first_name} ${patient.last_name} ${patient.phone}`);
    return tokens.every((token) => haystack.includes(token));
  });

  return matches.slice(0, 8);
}
