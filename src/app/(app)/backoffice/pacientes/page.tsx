import Link from "next/link";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function BackofficePacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  requireAdmin(user);

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  let patientsQuery = supabase
    .from("patients")
    .select("id, first_name, last_name, phone, insurance_companies(name)")
    .order("last_name");

  if (query.length >= 2) {
    const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);
    patientsQuery = patientsQuery.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
  }

  const { data: patients } = await patientsQuery;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Pacientes</h1>
        <p className="text-sm text-slate-500">
          Pacientes registrados (los particulares no se registran, así que no aparecen aquí). Entra en cada uno para
          ver sus datos y su historial de citas.
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre o teléfono…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <button
          type="submit"
          className="whitespace-nowrap rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
        >
          Buscar
        </button>
      </form>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {patients?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/backoffice/pacientes/${p.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <span>
                <span className="block text-slate-900">
                  {p.first_name} {p.last_name}
                </span>
                <span className="block text-sm text-slate-500">
                  {p.phone}
                  {p.insurance_companies?.name ? ` · ${p.insurance_companies.name}` : ""}
                </span>
              </span>
              <span className="text-sm text-slate-400">Ver →</span>
            </Link>
          </li>
        ))}
        {patients?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            {query ? "Sin resultados para esa búsqueda." : "Todavía no hay pacientes registrados."}
          </li>
        )}
      </ul>
    </div>
  );
}
