import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateEs, weekDates } from "@/lib/domain/dates";
import type { AgendaType } from "@/lib/supabase/database.types";

export async function WeekView({ agenda, date }: { agenda: AgendaType; date: string }) {
  const dates = weekDates(date);
  const supabase = await createClient();

  const [{ data: days }, { data: appointments }] = await Promise.all([
    supabase.from("agenda_days").select("date, is_open").eq("agenda", agenda).in("date", dates),
    supabase
      .from("appointments")
      .select("date, status")
      .eq("agenda", agenda)
      .in("date", dates)
      .neq("status", "cancelada"),
  ]);

  const openByDate = new Map((days ?? []).map((d) => [d.date, d.is_open]));
  const countByDate = new Map<string, number>();
  const pendienteDates = new Set<string>();
  for (const a of appointments ?? []) {
    countByDate.set(a.date, (countByDate.get(a.date) ?? 0) + 1);
    if (a.status === "pendiente") pendienteDates.add(a.date);
  }

  return (
    <ul className="space-y-2">
      {dates.map((d) => {
        const isOpen = openByDate.get(d) ?? false;
        const count = countByDate.get(d) ?? 0;
        const hasPendiente = pendienteDates.has(d);
        return (
          <li key={d}>
            <Link
              href={`/agenda/${agenda}?vista=dia&fecha=${d}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
            >
              <span className="capitalize text-slate-900">
                {formatDateEs(d, { weekday: "long", day: "numeric", month: "long" })}
              </span>
              <span className="flex items-center gap-2 text-sm">
                <span className={isOpen ? "text-emerald-700" : "text-slate-400"}>{isOpen ? "Abierto" : "Cerrado"}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      hasPendiente ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                    {hasPendiente ? " pend." : ""}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
