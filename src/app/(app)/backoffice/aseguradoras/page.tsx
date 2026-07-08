import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleInsuranceCompanyAction } from "@/lib/actions/insurance-companies";
import { InsuranceCompanyForm } from "./insurance-company-form";
import { CompanyDurationForm } from "./company-duration-form";

export default async function BackofficeInsuranceCompaniesPage() {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  const [{ data: companies }, { data: config }] = await Promise.all([
    supabase.from("insurance_companies").select("*").order("name"),
    supabase.from("agenda_config").select("default_duration_minutes").eq("agenda", "traumatologo").single(),
  ]);
  const agendaDefaultDurationMinutes = config?.default_duration_minutes ?? 15;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Compañías aseguradoras</h1>
        <p className="text-sm text-slate-500">
          Catálogo que se usa al elegir la compañía en una cita. &quot;Particular&quot; siempre está disponible y no
          hace falta darla de alta aquí. La duración solo importa en traumatología y quirófano (enfermería no tiene
          hora); si eliges &quot;Por defecto&quot;, la cita usa la duración configurada en esa agenda.
        </p>
      </div>

      <InsuranceCompanyForm />

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {companies?.map((company) => (
          <li key={company.id} className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className={company.active ? "text-slate-900" : "text-slate-400 line-through"}>
                {company.name}
              </span>
              <form action={toggleInsuranceCompanyAction.bind(null, company.id, !company.active)}>
                <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
                  {company.active ? "Dar de baja" : "Reactivar"}
                </button>
              </form>
            </div>
            <CompanyDurationForm
              companyId={company.id}
              durationMinutes={company.duration_minutes}
              agendaDefaultDurationMinutes={agendaDefaultDurationMinutes}
            />
          </li>
        ))}
        {companies?.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Sin compañías todavía.</li>}
      </ul>
    </div>
  );
}
