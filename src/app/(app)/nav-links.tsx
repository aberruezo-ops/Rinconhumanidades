"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGENDA_COLORS } from "@/lib/domain/agendas";
import type { AgendaType } from "@/lib/supabase/database.types";

export type NavItem = { href: string; label: string; agenda?: AgendaType };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const activeColor = item.agenda ? AGENDA_COLORS[item.agenda].text : "text-brand-700";
        const base = variant === "top" ? "px-3 py-2 text-sm font-medium" : "flex-1 py-2.5 text-center text-xs font-medium";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${base} ${isActive ? `${activeColor} font-semibold` : "text-slate-600 hover:text-slate-900"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
