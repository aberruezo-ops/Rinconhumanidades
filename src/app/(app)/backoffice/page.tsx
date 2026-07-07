import Link from "next/link";
import { requireAdmin, requireUser } from "@/lib/auth";
import { AGENDAS } from "@/lib/domain/agendas";

const SECTIONS = [
  {
    href: "/backoffice/agendas",
    title: "Agendas",
    description: "Días por defecto, duración de citas y horario de jornada de cada agenda.",
  },
  {
    href: "/backoffice/aseguradoras",
    title: "Compañías aseguradoras",
    description: "Catálogo de compañías que se pueden elegir al crear una cita.",
  },
  {
    href: "/backoffice/tipos-cita",
    title: "Tipos de cita de enfermería",
    description: "Cura, infiltración de células madre, PRP…",
  },
];

export default async function BackofficePage() {
  const user = await requireUser();
  requireAdmin(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Backoffice</h1>
        <p className="text-sm text-slate-500">Configuración de la consulta.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <p className="font-medium text-slate-900">{section.title}</p>
            <p className="text-sm text-slate-500">{section.description}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Gestión de días por agenda</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {AGENDAS.map((agenda) => (
            <Link
              key={agenda.value}
              href={`/backoffice/dias/${agenda.value}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
            >
              <p className="font-medium text-slate-900">{agenda.label}</p>
              <p className="text-sm text-slate-500">Abrir / cerrar días</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
