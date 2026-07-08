"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AGENDA_COLORS } from "@/lib/domain/agendas";
import type { AgendaType } from "@/lib/supabase/database.types";

export type NavItem = {
  href: string;
  label: string;
  agenda?: AgendaType;
  icon?: string;
  accent?: { dot: string; text: string };
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <>
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const colors = item.agenda ? AGENDA_COLORS[item.agenda] : item.accent;
        const activeColor = colors?.text ?? "text-brand-700";

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={isActive ? activeRef : null}
            aria-label={item.icon ? item.label : undefined}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium ${
              isActive ? `${activeColor} bg-slate-50 font-semibold` : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {colors && <span className={`h-2 w-2 rounded-full ${colors.dot}`} />}
            {item.icon ? (
              <span className="text-base" aria-hidden="true">
                {item.icon}
              </span>
            ) : (
              item.label
            )}
          </Link>
        );
      })}
    </>
  );
}
