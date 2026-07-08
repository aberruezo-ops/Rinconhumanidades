import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleAppointmentTypeAction } from "@/lib/actions/appointment-types";
import { AppointmentTypeForm } from "./appointment-type-form";

export default async function BackofficeAppointmentTypesPage() {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  const { data: types } = await supabase
    .from("appointment_types")
    .select("*")
    .eq("agenda", "enfermeria")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Tipos de cita de enfermería</h1>
        <p className="text-sm text-slate-500">Cura, PRP…</p>
      </div>

      <AppointmentTypeForm />

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {types?.map((type) => (
          <li key={type.id} className="flex items-center justify-between px-4 py-3">
            <span className={type.active ? "text-slate-900" : "text-slate-400 line-through"}>
              {type.name}{" "}
              <span className="text-sm text-slate-500">({type.default_duration_minutes} min)</span>
            </span>
            <form action={toggleAppointmentTypeAction.bind(null, type.id, !type.active)}>
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
                {type.active ? "Dar de baja" : "Reactivar"}
              </button>
            </form>
          </li>
        ))}
        {types?.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Sin tipos todavía.</li>}
      </ul>
    </div>
  );
}
