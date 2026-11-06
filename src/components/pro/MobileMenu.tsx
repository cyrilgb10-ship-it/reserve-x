"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  LayoutDashboard,
  Store,
  Building2,
  CalendarDays,
  Wallet,
  Settings,
  ArrowRight,
} from "lucide-react";

const navigation = [
  {
    label: "Tableau de bord",
    href: "/pro/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Mon établissement",
    href: "/pro/profil",
    icon: Store,
  },
  {
    label: "Mes prestations",
    href: "/pro/prestations",
    icon: Building2,
  },
  {
    label: "Réservations",
    href: "/pro/reservations",
    icon: CalendarDays,
  },
  {
    label: "Portefeuille",
    href: "/pro/portefeuille",
    icon: Wallet,
  },
  {
    label: "Abonnement",
    href: "/pro/abonnement",
    icon: Settings,
  },
];

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* BOUTON D'OUVERTURE */}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={isOpen}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#061b31] shadow-sm transition hover:border-[#533afd]/30 hover:bg-[#533afd]/5 hover:text-[#533afd] lg:hidden"
      >
        <Menu size={23} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">

          {/* FOND SOMBRE */}

          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full bg-[#061b31]/60 backdrop-blur-sm"
          />

          {/* PANNEAU DU MENU */}

          <aside className="absolute inset-y-0 left-0 flex h-[100dvh] w-[300px] max-w-[85vw] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl">

            {/* LOGO ET FERMETURE */}

            <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">

              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#061b31]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white shadow-md shadow-[#533afd]/20">
                  R
                </span>

                Reserve<span className="text-[#533afd]">X</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[#533afd]/20 hover:bg-[#533afd]/5 hover:text-[#533afd]"
              >
                <X size={21} />
              </button>

            </div>

            {/* NAVIGATION */}

            <div className="flex-1 overflow-y-auto px-4 py-7">

              <p className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
                Espace professionnel
              </p>

              <nav className="space-y-2">

                {navigation.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex min-h-[52px] items-center gap-4 rounded-xl px-4 py-3 text-sm transition ${
                        index === 0
                          ? "border border-[#533afd]/10 bg-[#533afd]/10 font-bold text-[#533afd]"
                          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-[#533afd]"
                      }`}
                    >
                      <Icon size={20} strokeWidth={2} />

                      <span>{item.label}</span>

                      {index === 0 && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-[#533afd]" />
                      )}
                    </Link>
                  );
                })}

              </nav>

            </div>

            {/* BAS DU MENU */}

            <div className="shrink-0 border-t border-slate-100 bg-white p-5">

              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#533afd]"
              >
                <ArrowRight size={19} />

                Retour au site
              </Link>

              <p className="mt-4 text-center text-[10px] text-slate-400">
                © 2026 Reserve X
              </p>

            </div>

          </aside>
        </div>
      )}
    </>
  );
}