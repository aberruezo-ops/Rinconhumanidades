import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { AGENDAS } from "@/lib/domain/agendas";
import { NavLinks, type NavItem } from "./nav-links";

const BASE_NAV: NavItem[] = [{ href: "/", label: "Inicio", icon: "🏠" }];
const AGENDA_NAV: NavItem[] = AGENDAS.map((a) => ({ href: `/agenda/${a.value}`, label: a.label, agenda: a.value }));
const ADMIN_ONLY_NAV: NavItem[] = [
  { href: "/listados", label: "Listados" },
  { href: "/backoffice", label: "Backoffice", accent: { dot: "bg-purple-900", text: "text-purple-900" } },
];
const READONLY_NAV: NavItem[] = [{ href: "/listados", label: "Listados" }];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const navItems = [...BASE_NAV, ...AGENDA_NAV, ...(isAdmin ? ADMIN_ONLY_NAV : READONLY_NAV)];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={28} height={22} priority />
            <span className="font-semibold text-slate-900">Dante</span>
          </Link>
          <div className="flex items-center gap-3">
            {user.fullName && <span className="text-sm text-slate-500">{user.fullName}</span>}
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
                Salir
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2">
          <NavLinks items={navItems} />
        </nav>
      </header>

      <main className="flex-1 px-4 py-4 print:p-0">{children}</main>
    </div>
  );
}
