import Link from "next/link";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agendaLabel, normalizeStatus, statusLabel } from "@/lib/domain/agendas";
import { daysInMonth, formatYearMonthParam, monthLabelEs, parseYearMonth, shiftYearMonth, ymd } from "@/lib/domain/dates";
import { generateSlotStarts } from "@/lib/domain/slots";
import type { AgendaType, AppointmentStatus } from "@/lib/supabase/database.types";

type AgendaDayRow = {
  agenda: AgendaType;
  is_open: boolean;
  start_time_override: string | null;
  end_time_override: string | null;
};
type ConfigRow = { agenda: AgendaType; start_time: string; end_time: string; default_duration_minutes: number };
type AppointmentRow = {
  agenda: AgendaType;
  start_time: string | null;
  status: AppointmentStatus;
  insurance_company_id: string | null;
  appointment_type_id: string | null;
  insurance_companies: { name: string } | null;
  appointment_types: { name: string } | null;
};

function capacityForAgenda(agenda: AgendaType, days: AgendaDayRow[], config: ConfigRow | undefined): number {
  if (!config) return 0;
  return days
    .filter((d) => d.agenda === agenda)
    .reduce((sum, d) => {
      const start = (d.start_time_override ?? config.start_time).slice(0, 5);
      const end = (d.end_time_override ?? config.end_time).slice(0, 5);
      return sum + generateSlotStarts(start, end, config.default_duration_minutes).length;
    }, 0);
}

function Meter({ label, occupied, capacity }: { label: string; occupied: number; capacity: number }) {
  const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : null;
  return (
    <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm text-slate-500">
          {pct === null ? "Sin jornada configurada" : `${occupied}/${capacity} huecos`}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-100">
        {pct !== null && <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, pct)}%` }} />}
      </div>
      <p className="text-right text-lg font-semibold text-slate-900">{pct === null ? "—" : `${pct}%`}</p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function RatioList({ rows }: { rows: { label: string; count: number }[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) return <p className="text-sm text-slate-500">Sin citas en este mes.</p>;
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  return (
    <ul className="space-y-2">
      {sorted.map((r) => {
        const pct = Math.round((r.count / total) * 100);
        return (
          <li key={r.label} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-700">{r.label}</span>
              <span className="text-slate-500">
                {r.count} · {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  requireAdmin(user);

  const { mes } = await searchParams;
  const now = new Date();
  const { year, month } = parseYearMonth(mes, { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
  const from = ymd(year, month, 1);
  const to = ymd(year, month, daysInMonth(year, month));
  const prev = shiftYearMonth(year, month, -1);
  const next = shiftYearMonth(year, month, 1);

  const supabase = await createClient();
  const [{ data: configs }, { data: days }, { data: appointments }] = await Promise.all([
    supabase.from("agenda_config").select("agenda, start_time, end_time, default_duration_minutes"),
    supabase
      .from("agenda_days")
      .select("agenda, is_open, start_time_override, end_time_override")
      .eq("is_open", true)
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("appointments")
      .select("agenda, start_time, status, insurance_company_id, appointment_type_id, insurance_companies(name), appointment_types(name)")
      .gte("date", from)
      .lte("date", to),
  ]);

  const allAppointments: AppointmentRow[] = appointments ?? [];
  const activeAppointments = allAppointments.filter((a) => normalizeStatus(a.status) !== "cancelada");
  const configByAgenda = new Map((configs ?? []).map((c) => [c.agenda, c]));

  const totalMes = allAppointments.length;
  const canceladas = allAppointments.filter((a) => normalizeStatus(a.status) === "cancelada").length;
  const noPresentado = allAppointments.filter((a) => normalizeStatus(a.status) === "no_presentado").length;
  const canceladasPct = totalMes > 0 ? Math.round((canceladas / totalMes) * 100) : 0;
  const noPresentadoPct = totalMes > 0 ? Math.round((noPresentado / totalMes) * 100) : 0;

  const capacidadTraumatologo = capacityForAgenda("traumatologo", days ?? [], configByAgenda.get("traumatologo"));
  const ocupadasTraumatologo = activeAppointments.filter((a) => a.agenda === "traumatologo" && a.start_time).length;
  const capacidadQuirofano = capacityForAgenda("quirofano", days ?? [], configByAgenda.get("quirofano"));
  const ocupadasQuirofano = activeAppointments.filter((a) => a.agenda === "quirofano" && a.start_time).length;

  const enfermeriaCitas = activeAppointments.filter((a) => a.agenda === "enfermeria").length;
  const diasEnfermeria = (days ?? []).filter((d) => d.agenda === "enfermeria").length;
  const promedioEnfermeria = diasEnfermeria > 0 ? (enfermeriaCitas / diasEnfermeria).toFixed(1) : "—";

  const companyRows = Object.values(
    activeAppointments.reduce<Record<string, { label: string; count: number }>>((acc, a) => {
      const key = a.insurance_company_id ?? "particular";
      const label = a.insurance_companies?.name ?? "Particular";
      acc[key] = acc[key] ? { ...acc[key], count: acc[key].count + 1 } : { label, count: 1 };
      return acc;
    }, {}),
  );

  const enfermeriaRows = Object.values(
    activeAppointments
      .filter((a) => a.agenda === "enfermeria")
      .reduce<Record<string, { label: string; count: number }>>((acc, a) => {
        const key = a.appointment_type_id ?? "sin_tipo";
        const label = a.appointment_types?.name ?? "Sin especificar";
        acc[key] = acc[key] ? { ...acc[key], count: acc[key].count + 1 } : { label, count: 1 };
        return acc;
      }, {}),
  );

  const quirofanoRows = Object.values(
    allAppointments
      .filter((a) => a.agenda === "quirofano")
      .reduce<Record<string, { label: string; count: number }>>((acc, a) => {
        const key = normalizeStatus(a.status);
        const label = statusLabel(key);
        acc[key] = acc[key] ? { ...acc[key], count: acc[key].count + 1 } : { label, count: 1 };
        return acc;
      }, {}),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Cuadro de mandos</h1>
        <p className="text-sm text-slate-500">Ocupación y ratios de la consulta, mes a mes.</p>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`?mes=${formatYearMonthParam(prev.year, prev.month)}`}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          ← Anterior
        </Link>
        <span className="font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</span>
        <Link
          href={`?mes=${formatYearMonthParam(next.year, next.month)}`}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Siguiente →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Citas del mes (no canceladas)" value={String(activeAppointments.length)} />
        <StatTile label="Cancelaciones" value={`${canceladasPct}%`} />
        <StatTile label="No presentados" value={`${noPresentadoPct}%`} />
      </div>

      <div className="space-y-2">
        <h2 className="font-medium text-slate-900">Ocupación</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Meter label={agendaLabel("traumatologo")} occupied={ocupadasTraumatologo} capacity={capacidadTraumatologo} />
          <Meter label={agendaLabel("quirofano")} occupied={ocupadasQuirofano} capacity={capacidadQuirofano} />
          <StatTile label={`${agendaLabel("enfermeria")} — citas / promedio por día`} value={`${enfermeriaCitas} · ${promedioEnfermeria}/día`} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium text-slate-900">Ratio por compañía</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <RatioList rows={companyRows} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium text-slate-900">Ratio en enfermería (por tipo)</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <RatioList rows={enfermeriaRows} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium text-slate-900">Quirófano (por estado)</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <RatioList rows={quirofanoRows} />
        </div>
      </div>
    </div>
  );
}
