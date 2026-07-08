import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildMonthWeeks, monthLabelEs, todayYmd } from "@/lib/domain/dates";
import type { AgendaType } from "@/lib/supabase/database.types";

export async function MonthView({ agenda, year, month }: { agenda: AgendaType; year: number; month: number }) {
  const supabase = await createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("date")
    .eq("agenda", agenda)
    .gte("date", from)
    .lte("date", to)
    .neq("status", "cancelada");

  const countByDate = new Map<string, number>();
  for (const a of appointments ?? []) {
    countByDate.set(a.date, (countByDate.get(a.date) ?? 0) + 1);
  }

  const weeks = buildMonthWeeks(year, month);
  const today = todayYmd();

  return (
    <div className="space-y-2">
      <p className="text-center text-sm font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</p>
      <p className="text-center text-xs text-slate-400">Solo se destacan los días con citas.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-1.5">
        <div className="grid grid-cols-7 text-center">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <span key={d} className="text-[11px] font-medium text-slate-400">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((cell, cellIndex) => {
              if (!cell) return <div key={cellIndex} />;
              const count = countByDate.get(cell.date) ?? 0;
              const isToday = cell.date === today;
              return (
                <Link
                  key={cellIndex}
                  href={`/agenda/${agenda}?vista=dia&fecha=${cell.date}`}
                  className={`relative flex h-8 items-center justify-center rounded-md text-xs ${
                    count > 0 ? "bg-sky-100 font-semibold text-sky-900 hover:bg-sky-200" : "text-slate-300 hover:bg-slate-50"
                  } ${isToday ? "ring-2 ring-slate-900" : ""}`}
                >
                  {cell.day}
                  {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sky-600 px-0.5 text-[9px] font-medium text-white">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
