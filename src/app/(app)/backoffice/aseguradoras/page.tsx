import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleInsuranceCompanyAction } from "@/lib/actions/insurance-companies";
import { InsuranceCompanyForm } from "./insurance-company-form";

export default async function BackofficeInsuranceCompaniesPage() {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  const { data: companies } = await supabase.from("insurance_companies").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Compañías aseguradoras</h1>
        <p className="text-sm text-slate-500">
          Catálogo que se usa al elegir la compañía en una cita. &quot;Particular&quot; siempre está disponible y no
          hace falta darla de alta aquí.
        </p>
      </div>

      <InsuranceCompanyForm />

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {companies?.map((company) => (
          <li key={company.id} className="flex items-center justify-between px-4 py-3">
            <span className={company.active ? "text-slate-900" : "text-slate-400 line-through"}>
              {company.name}
            </span>
            <form action={toggleInsuranceCompanyAction.bind(null, company.id, !company.active)}>
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
                {company.active ? "Dar de baja" : "Reactivar"}
              </button>
            </form>
          </li>
        ))}
        {companies?.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Sin compañías todavía.</li>}
      </ul>
    </div>
  );
}
