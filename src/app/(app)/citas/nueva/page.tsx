import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAgendaType, agendaLabel } from "@/lib/domain/agendas";
import { todayYmd } from "@/lib/domain/dates";
import { createAppointmentAction } from "@/lib/actions/appointments";
import { AppointmentForm } from "../_components/appointment-form";
import type { AgendaType } from "@/lib/supabase/database.types";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ agenda?: string; fecha?: string; hora?: string }>;
}) {
  const user = await requireUser();
  requireAdmin(user);

  const { agenda: agendaParam, fecha, hora } = await searchParams;
  if (!agendaParam || !isAgendaType(agendaParam)) notFound();
  const agenda: AgendaType = agendaParam;

  const supabase = await createClient();
  const [{ data: companies }, { data: types }, { data: config }] = await Promise.all([
    supabase.from("insurance_companies").select("id, name").eq("active", true).order("name"),
    supabase
      .from("appointment_types")
      .select("id, name, default_duration_minutes")
      .eq("agenda", "enfermeria")
      .eq("active", true)
      .order("name"),
    supabase.from("agenda_config").select("default_duration_minutes, start_time").eq("agenda", agenda).single(),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Nueva cita — {agendaLabel(agenda)}</h1>
      <AppointmentForm
        agenda={agenda}
        action={createAppointmentAction}
        insuranceCompanies={companies ?? []}
        appointmentTypes={types ?? []}
        defaults={{
          date: fecha ?? todayYmd(),
          start_time: hora ?? (config?.start_time.slice(0, 5) ?? "09:00"),
          duration_minutes: config?.default_duration_minutes ?? 15,
          patient: null,
          particular_label: "",
          insurance_company_id: "",
          appointment_type_id: "",
          status: "programada",
          pathology: "",
          prosthesis_brand: "",
          dni: "",
          observations: "",
          follow_up_date: "",
        }}
      />
    </div>
  );
}
