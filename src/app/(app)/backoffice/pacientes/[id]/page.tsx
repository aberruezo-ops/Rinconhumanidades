import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agendaLabel, statusLabel, statusStyle } from "@/lib/domain/agendas";
import { formatDateEs, formatTimeEs, todayYmd } from "@/lib/domain/dates";
import type { AgendaType, AppointmentStatus } from "@/lib/supabase/database.types";

type Cita = {
  id: string;
  agenda: AgendaType;
  date: string;
  start_time: string | null;
  status: AppointmentStatus;
  observations: string | null;
};

function CitasList({ citas }: { citas: Cita[] }) {
  if (citas.length === 0) return <p className="text-sm text-slate-500">Sin citas.</p>;
  return (
    <ul className="space-y-2">
      {citas.map((a) => (
        <li key={a.id}>
          <Link
            href={`/citas/${a.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-slate-300"
          >
            <span className="text-sm">
              <span className="block text-slate-900">
                {formatDateEs(a.date, { day: "numeric", month: "short", year: "numeric" })}
                {a.start_time ? ` · ${formatTimeEs(a.start_time)}` : ""}
              </span>
              <span className="block text-xs text-slate-500">
                {agendaLabel(a.agenda)}
                {a.observations ? ` · ${a.observations}` : ""}
              </span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(a.status)}`}>
              {statusLabel(a.status)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  requireAdmin(user);

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: patient }, { data: appointments }] = await Promise.all([
    supabase.from("patients").select("*, insurance_companies(name)").eq("id", id).single(),
    supabase
      .from("appointments")
      .select("id, agenda, date, start_time, status, observations")
      .eq("patient_id", id)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false }),
  ]);

  if (!patient) notFound();

  const today = todayYmd();
  const citas = appointments ?? [];
  const proximas = citas.filter((a) => a.date >= today && a.status !== "cancelada").reverse();
  const pasadas = citas.filter((a) => a.date < today || a.status === "cancelada");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/backoffice/pacientes" className="text-sm text-brand-700 hover:underline">
          ← Volver a pacientes
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">
          {patient.first_name} {patient.last_name}
        </h1>
      </div>

      <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span className="text-slate-500">Teléfono:</span> {patient.phone}
        </p>
        <p>
          <span className="text-slate-500">Compañía:</span> {patient.insurance_companies?.name ?? "Particular"}
        </p>
        {patient.dni && (
          <p>
            <span className="text-slate-500">DNI:</span> {patient.dni}
          </p>
        )}
        {patient.notes && (
          <p>
            <span className="text-slate-500">Notas:</span> {patient.notes}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-medium text-slate-900">Próximas citas</h2>
        <CitasList citas={proximas} />
      </div>

      <div className="space-y-2">
        <h2 className="font-medium text-slate-900">Historial</h2>
        <CitasList citas={pasadas} />
      </div>
    </div>
  );
}
