import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DictadoFlow } from "./dictado-flow";

export default async function DictadoCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ agenda?: string; fecha?: string }>;
}) {
  const user = await requireUser();
  requireAdmin(user);

  const { agenda, fecha } = await searchParams;

  const supabase = await createClient();
  const [{ data: companies }, { data: types }, { data: agendaConfigs }] = await Promise.all([
    supabase.from("insurance_companies").select("id, name, duration_minutes").eq("active", true).order("name"),
    supabase
      .from("appointment_types")
      .select("id, name, default_duration_minutes")
      .eq("agenda", "enfermeria")
      .eq("active", true)
      .order("name"),
    supabase.from("agenda_config").select("agenda, default_duration_minutes"),
  ]);

  const agendaDurations = Object.fromEntries((agendaConfigs ?? []).map((c) => [c.agenda, c.default_duration_minutes]));

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Nueva cita por dictado</h1>
      <DictadoFlow
        insuranceCompanies={companies ?? []}
        appointmentTypes={types ?? []}
        agendaDurations={agendaDurations}
        hintAgenda={agenda}
        hintDate={fecha}
      />
    </div>
  );
}
