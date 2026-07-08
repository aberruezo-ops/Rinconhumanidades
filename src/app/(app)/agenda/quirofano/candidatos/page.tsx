import Link from "next/link";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateEs, todayYmd, daysBetween } from "@/lib/domain/dates";
import { buildWhatsappLink } from "@/lib/domain/whatsapp";
import {
  markCandidatoConvertidoAction,
  discardCandidatoAction,
  markCandidatoWhatsappSentAction,
} from "@/lib/actions/quirofano-candidatos";
import { WhatsappButton } from "@/app/(app)/_components/whatsapp-button";
import { CandidatoForm } from "./candidato-form";

const REMINDER_WINDOW_DAYS = 30;

export default async function CandidatosQuirofanoPage() {
  const user = await requireUser();
  requireAdmin(user);

  const supabase = await createClient();
  const { data: candidatos } = await supabase
    .from("quirofano_candidatos")
    .select("*, patients(first_name, last_name, phone)")
    .order("status")
    .order("desired_date", { nullsFirst: true });

  const today = todayYmd();
  const pendientes = (candidatos ?? []).filter((c) => c.status === "pendiente");
  const resueltos = (candidatos ?? []).filter((c) => c.status !== "pendiente");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Candidatos de quirófano</h1>
        <p className="text-sm text-slate-500">
          Pacientes en estudio para quirófano sin día ni hora reservados todavía — como mucho, un deseo de fecha
          aproximada. Un mes antes de esa fecha aparecen aquí y en Inicio para llamarles y cerrar la cita real.
        </p>
        <Link href="/agenda/quirofano" className="text-sm text-brand-700 hover:underline">
          ← Volver a la agenda de quirófano
        </Link>
      </div>

      <CandidatoForm />

      <div className="space-y-2">
        <h2 className="font-medium text-slate-900">Pendientes</h2>
        <ul className="space-y-2">
          {pendientes.map((c) => {
            const name = c.particular_label ?? (c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "—");
            const withinWindow = c.desired_date != null && daysBetween(today, c.desired_date) <= REMINDER_WINDOW_DAYS;
            const phone = c.patients?.phone;
            return (
              <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{name}</p>
                    <p className="text-sm text-slate-500">
                      {c.desired_date
                        ? `Fecha deseada: ${formatDateEs(c.desired_date, { day: "numeric", month: "long", year: "numeric" })}`
                        : "Sin fecha aproximada"}
                    </p>
                    {c.observations && <p className="mt-1 text-sm text-slate-600">{c.observations}</p>}
                  </div>
                  {withinWindow && phone && (
                    <WhatsappButton
                      onMarkSent={markCandidatoWhatsappSentAction.bind(null, c.id)}
                      phone={phone}
                      sentAt={c.whatsapp_sent_at}
                      message={`Hola ${c.patients ? c.patients.first_name : name}, le llamamos de traumatología para concretar la fecha de su intervención de quirófano. ¿Podría confirmarnos disponibilidad? Gracias.`}
                    />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/citas/nueva?agenda=quirofano${c.desired_date ? `&fecha=${c.desired_date}` : ""}`}
                    className="text-brand-700 hover:underline"
                  >
                    Convertir en cita
                  </Link>
                  <form action={markCandidatoConvertidoAction.bind(null, c.id)}>
                    <button type="submit" className="text-emerald-700 hover:underline">
                      Marcar convertido
                    </button>
                  </form>
                  <form action={discardCandidatoAction.bind(null, c.id)}>
                    <button type="submit" className="text-slate-500 hover:underline">
                      Descartar
                    </button>
                  </form>
                  {phone && !withinWindow && (
                    <a
                      href={buildWhatsappLink(phone, `Hola ${name}, le escribimos de traumatología por su intervención de quirófano.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:underline"
                    >
                      WhatsApp (fuera de plazo de aviso)
                    </a>
                  )}
                </div>
              </li>
            );
          })}
          {pendientes.length === 0 && <p className="text-sm text-slate-500">Sin candidatos pendientes.</p>}
        </ul>
      </div>

      {resueltos.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-slate-900">Resueltos</h2>
          <ul className="space-y-1">
            {resueltos.map((c) => {
              const name = c.particular_label ?? (c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "—");
              return (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-500">
                  <span>{name}</span>
                  <span className="capitalize">{c.status}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
