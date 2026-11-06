import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  CreditCard,
  Wallet,
  Receipt,
  Star,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminLogoutButton from "@/app/admin/components/AdminLogoutButton";

const navigation = [
  {
    label: "Vue d'ensemble",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Professionnels",
    href: "/admin/professionnels",
    icon: Building2,
  },
  {
    label: "Clients",
    href: "/admin/clients",
    icon: Users,
  },
  {
    label: "Réservations",
    href: "/admin/reservations",
    icon: CalendarDays,
  },
  {
    label: "Paiements",
    href: "/admin/paiements",
    icon: CreditCard,
  },
  {
    label: "Abonnements",
    href: "/admin/abonnements",
    icon: Receipt,
  },
  {
    label: "Retraits",
    href: "/admin/retraits",
    icon: Wallet,
  },
  {
    label: "Avis clients",
    href: "/admin/avis",
    icon: Star,
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const session = await getSession();

  // Vérification de la session et du rôle.
  if (!session || session.role !== "ADMIN") {
    redirect("/admin/connexion");
  }

  // Vérification du véritable compte dans PostgreSQL.
  const admin = await prisma.user.findUnique({
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

  // Refuser l'accès si le compte n'existe plus
  // ou si son rôle n'est plus ADMIN.
  if (!admin || admin.role !== "ADMIN") {
    redirect("/admin/connexion");
  }

  const adminName = admin.name?.trim() || "Administrateur";
  const adminEmail = admin.email;

  return (
    <div className="min-h-screen bg-[#f8fafd] text-[#061b31]">

      {/* BARRE LATÉRALE */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#e5edf5] bg-white lg:flex lg:flex-col">

        {/* LOGO */}
        <div className="flex h-20 items-center border-b border-[#e5edf5] px-7">
          <Link
            href="/admin"
            className="text-2xl font-extrabold tracking-tight"
          >
            Reserve<span className="text-[#533afd]">X</span>
          </Link>
        </div>

        {/* IDENTITÉ ADMINISTRATION */}
        <div className="border-b border-[#e5edf5] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#533afd]/10">
              <ShieldCheck className="h-5 w-5 text-[#533afd]" />
            </div>

            <div>
              <p className="text-sm font-bold">
                Administration
              </p>

              <p className="text-xs text-slate-400">
                Espace de gestion
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">

          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Menu principal
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded px-3 py-3 text-sm font-medium transition ${
                  item.href === "/admin"
                    ? "bg-[#533afd]/10 text-[#533afd]"
                    : "text-slate-500 hover:bg-[#f8fafd] hover:text-[#061b31]"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />

                {item.label}
              </Link>
            );
          })}

        </nav>

        {/* ADMIN CONNECTÉ */}
        <div className="border-t border-[#e5edf5] p-5">
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#061b31] text-sm font-bold text-white">
              {adminName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {adminName}
              </p>

              <p className="truncate text-xs text-slate-400">
                {adminEmail}
              </p>
            </div>

            <ArrowUpRight className="h-4 w-4 text-slate-400" />

          </div>
        </div>

      </aside>

      <AdminLogoutButton />

      {/* CONTENU PRINCIPAL */}
      <div className="lg:pl-64">

        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#e5edf5] bg-white/95 px-5 backdrop-blur sm:px-8">

          <div>
            <p className="text-xs font-medium text-slate-400">
              Reserve X
            </p>

            <p className="text-sm font-bold text-[#061b31]">
              Administration
            </p>
          </div>

          <div className="flex items-center gap-3">

            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#533afd]/10">
              <ShieldCheck className="h-4 w-4 text-[#533afd]" />
            </span>

            <span className="hidden text-sm font-semibold sm:block">
              {adminName}
            </span>

          </div>
        </header>

        {/* PAGES ADMIN */}
        <main className="mx-auto max-w-[1500px] p-5 sm:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}