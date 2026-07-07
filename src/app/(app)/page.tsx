import Link from "next/link";
import { AGENDAS } from "@/lib/domain/agendas";

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold capitalize text-slate-900">{today}</h1>
        <p className="text-sm text-slate-500">Accesos rápidos a las agendas del día.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {AGENDAS.map((agenda) => (
          <Link
            key={agenda.value}
            href={`/agenda/${agenda.value}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <p className="font-medium text-slate-900">{agenda.label}</p>
            <p className="text-sm text-slate-500">{agenda.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
