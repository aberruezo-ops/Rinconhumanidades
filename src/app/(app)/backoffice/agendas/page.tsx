import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGENDAS, agendaLabel } from "@/lib/domain/agendas";
import { AgendaConfigForm } from "./agenda-config-form";

export default async function BackofficeAgendasPage() {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  const { data: configs } = await supabase.from("agenda_config").select("*");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Agendas</h1>
        <p className="text-sm text-slate-500">
          Días por defecto, duración de citas y horario de jornada de cada agenda.
        </p>
      </div>

      <div className="space-y-4">
        {AGENDAS.map((agenda) => {
          const config = configs?.find((c) => c.agenda === agenda.value);
          if (!config) return null;
          return <AgendaConfigForm key={agenda.value} config={config} label={agendaLabel(agenda.value)} />;
        })}
      </div>
    </div>
  );
}
