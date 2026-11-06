import Link from "next/link";
import { redirect } from "next/navigation";

import {
  LayoutDashboard,
  Ticket,
  Star,
  UserRound,
  LogOut,
  Search,
  ChevronRight,
} from "lucide-react";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PushNotifications from "@/components/PushNotifications";

import { logoutClient } from "./actions";

export const instant = false;

const navigation = [
  {
    label: "Tableau de bord",
    href: "/client/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Mes tickets",
    href: "/client/tickets",
    icon: Ticket,
  },
  {
    label: "Mes avis",
    href: "/client/avis",
    icon: Star,
  },
  {
    label: "Mon profil",
    href: "/client/profil",
    icon: UserRound,
  },
];

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== "CUSTOMER") {
    redirect("/client/connexion");
  }

  const customer = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!customer || customer.role !== "CUSTOMER") {
    redirect("/client/connexion");
  }

  const initials = customer.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-[#FFFBF2] text-[#18181B]">
      <div className="flex min-h-screen">

        {/* SIDEBAR DESKTOP */}
        <aside className="hidden w-[260px] shrink-0 border-r border-[#F1E8D8] bg-white lg:flex lg:flex-col">

          {/* LOGO */}
          <div className="flex h-[76px] items-center border-b border-[#F1E8D8] px-7">
            <Link
              href="/"
              className="flex items-center gap-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B] text-white">
                <Ticket size={19} />
              </div>

              <span className="text-xl font-bold tracking-tight">
                Reserve <span className="text-[#F59E0B]">X</span>
              </span>
            </Link>
          </div>

          {/* NAVIGATION */}
          <div className="flex-1 px-4 py-7">

            <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A1A1AA]">
              Espace personnel
            </p>

            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#71717A] transition hover:bg-[#FFFBF2] hover:text-[#D97706]"
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.8}
                      className="transition group-hover:text-[#F59E0B]"
                    />

                    <span>{item.label}</span>

                    <ChevronRight
                      size={15}
                      className="ml-auto opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-9 rounded-2xl border border-[#FDE7B0] bg-[#FFFBF2] p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBBF24] text-white">
                <Search size={18} />
              </div>

              <p className="text-sm font-semibold">
                Trouvez votre prochaine expérience
              </p>

              <p className="mt-1 text-xs leading-5 text-[#71717A]">
                Découvrez des établissements et réservez facilement.
              </p>

              <Link
                href="/recherche"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#D97706] hover:underline"
              >
                Explorer les services
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* UTILISATEUR */}
          <div className="border-t border-[#F1E8D8] p-4">

            <div className="flex items-center gap-3 px-2 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-sm font-bold text-[#B45309]">
                {initials || "C"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {customer.name}
                </p>

                <p className="truncate text-xs text-[#71717A]">
                  {customer.email}
                </p>
              </div>
            </div>

            <form action={logoutClient}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#71717A] transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={18} />
                Se déconnecter
              </button>
            </form>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* HEADER */}
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#F1E8D8] bg-white/95 px-5 backdrop-blur sm:px-8">

            <div>
              <p className="text-xs text-[#A1A1AA]">
                Espace client
              </p>

              <p className="text-sm font-semibold">
                Bienvenue, {customer.name.split(" ")[0]}
              </p>
            </div>

            <Link
              href="/recherche"
              className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#D97706]"
            >
              <Search size={15} />
              <span className="hidden sm:inline">
                Explorer
              </span>
            </Link>
          </header>

          {/* NAVIGATION MOBILE */}
          <nav className="flex gap-2 overflow-x-auto border-b border-[#F1E8D8] bg-white px-4 py-3 lg:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-[#F1E8D8] px-3 py-2 text-xs font-medium text-[#71717A] transition hover:border-[#FBBF24] hover:bg-[#FFFBF2]"
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* PAGE */}
          <main className="w-full flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-[1400px] space-y-6">

              {/* NOTIFICATIONS PUSH */}
              <PushNotifications />

              {children}
            </div>
          </main>

          {/* FOOTER */}
          <footer className="border-t border-[#F1E8D8] bg-white px-5 py-5 text-center text-xs text-[#A1A1AA]">
            © {new Date().getFullYear()} Reserve X. Tous droits réservés.
          </footer>
        </div>
      </div>
    </div>
  );
}