import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildMonthWeeks, monthLabelEs, todayYmd } from "@/lib/domain/dates";
import type { AgendaType } from "@/lib/supabase/database.types";

export async function MonthView({ agenda, year, month }: { agenda: AgendaType; year: number; month: number }) {
  const supabase = await createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const [{ data: days }, { data: appointments }] = await Promise.all([
    supabase.from("agenda_days").select("date, is_open").eq("agenda", agenda).gte("date", from).lte("date", to),
    supabase.from("appointments").select("date").eq("agenda", agenda).gte("date", from).lte("date", to).neq("status", "cancelada"),
  ]);

  const openByDate = new Map((days ?? []).map((d) => [d.date, d.is_open]));
  const countByDate = new Map<string, number>();
  for (const a of appointments ?? []) {
    countByDate.set(a.date, (countByDate.get(a.date) ?? 0) + 1);
  }

  const weeks = buildMonthWeeks(year, month);
  const today = todayYmd();

  return (
    <div className="space-y-3">
      <p className="text-center font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
        <table className="w-full min-w-[560px] table-fixed border-collapse text-center">
          <thead>
            <tr>
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <th key={d} className="pb-2 text-xs font-medium text-slate-500">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((cell, cellIndex) => {
                  if (!cell) return <td key={cellIndex} className="p-1" />;
                  const isOpen = openByDate.get(cell.date) ?? false;
                  const count = countByDate.get(cell.date) ?? 0;
                  const isToday = cell.date === today;
                  return (
                    <td key={cellIndex} className="p-1">
                      <Link
                        href={`/agenda/${agenda}?vista=dia&fecha=${cell.date}`}
                        className={`flex aspect-square w-full flex-col items-center justify-center rounded-lg text-sm font-medium ${
                          isOpen ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        } ${isToday ? "ring-2 ring-offset-1 ring-slate-900" : ""}`}
                      >
                        <span>{cell.day}</span>
                        {count > 0 && <span className="text-[10px] text-slate-500">{count}</span>}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
