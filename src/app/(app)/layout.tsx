import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { AGENDAS } from "@/lib/domain/agendas";

const BASE_NAV = [{ href: "/", label: "Inicio" }];
const AGENDA_NAV = AGENDAS.map((a) => ({ href: `/agenda/${a.value}`, label: a.label }));
const ADMIN_ONLY_NAV = [
  { href: "/listados", label: "Listados" },
  { href: "/backoffice", label: "Backoffice" },
];
const READONLY_NAV = [{ href: "/listados", label: "Listados" }];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const navItems = [...BASE_NAV, ...AGENDA_NAV, ...(isAdmin ? ADMIN_ONLY_NAV : READONLY_NAV)];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-slate-900">Dante</span>
          <div className="flex items-center gap-3">
            {user.fullName && <span className="text-sm text-slate-500">{user.fullName}</span>}
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
                Salir
              </button>
            </form>
          </div>
        </div>
        <nav className="hidden gap-1 border-t border-slate-100 px-4 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-4 pb-20 md:pb-4 print:p-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-slate-200 bg-white md:hidden print:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 py-2.5 text-center text-xs font-medium text-slate-600"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
