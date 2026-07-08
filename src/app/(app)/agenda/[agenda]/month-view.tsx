import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildMonthWeeks, formatDateEs, monthLabelEs, shiftYearMonth, todayYmd, ymd } from "@/lib/domain/dates";
import type { AgendaType } from "@/lib/supabase/database.types";
import { DayView } from "./day-view";

export async function MonthView({
  agenda,
  year,
  month,
  selectedDate,
}: {
  agenda: AgendaType;
  year: number;
  month: number;
  selectedDate: string;
}) {
  const supabase = await createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("date, status")
    .eq("agenda", agenda)
    .gte("date", from)
    .lte("date", to)
    .neq("status", "cancelada");

  const countByDate = new Map<string, number>();
  const pendienteDates = new Set<string>();
  for (const a of appointments ?? []) {
    countByDate.set(a.date, (countByDate.get(a.date) ?? 0) + 1);
    if (a.status === "pendiente") pendienteDates.add(a.date);
  }

  const weeks = buildMonthWeeks(year, month);
  const today = todayYmd();
  const prevMonth = shiftYearMonth(year, month, -1);
  const nextMonth = shiftYearMonth(year, month, 1);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Link
            href={`/agenda/${agenda}?vista=mes&fecha=${ymd(prevMonth.year, prevMonth.month, 1)}`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Anterior
          </Link>
          <p className="text-sm font-medium capitalize text-slate-900">{monthLabelEs(year, month)}</p>
          <Link
            href={`/agenda/${agenda}?vista=mes&fecha=${ymd(nextMonth.year, nextMonth.month, 1)}`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Siguiente →
          </Link>
        </div>
        <p className="text-center text-xs text-slate-400">
          Solo se destacan los días con citas{agenda === "quirofano" ? " (en ámbar, los que tienen alguna pendiente)" : ""}.
        </p>
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
                const hasPendiente = pendienteDates.has(cell.date);
                const isToday = cell.date === today;
                const isSelected = cell.date === selectedDate;
                return (
                  <Link
                    key={cellIndex}
                    href={`/agenda/${agenda}?vista=mes&fecha=${cell.date}`}
                    className={`relative flex h-8 items-center justify-center rounded-md text-xs ${
                      hasPendiente
                        ? "bg-amber-100 font-semibold text-amber-900 hover:bg-amber-200"
                        : count > 0
                          ? "bg-sky-100 font-semibold text-sky-900 hover:bg-sky-200"
                          : "text-slate-300 hover:bg-slate-50"
                    } ${isSelected ? "ring-2 ring-brand-600" : isToday ? "ring-2 ring-slate-900" : ""}`}
                  >
                    {cell.day}
                    {count > 0 && (
                      <span
                        className={`absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-medium text-white ${
                          hasPendiente ? "bg-amber-600" : "bg-sky-600"
                        }`}
                      >
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

      <div className="space-y-2">
        <p className="text-sm font-medium capitalize text-slate-900">
          {formatDateEs(selectedDate, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <DayView agenda={agenda} date={selectedDate} />
      </div>
    </div>
  );
}
