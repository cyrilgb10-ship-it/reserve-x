"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  CalendarDays,
  Clock3,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
  Wallet,
  MapPin,
  QrCode,
  Headset,
} from "lucide-react";

// ======================================================
// TYPES
// ======================================================

type TicketData = {
  id: string;
  reference: string;
  startsAt: string;
  endsAt: string | null;
  amount: number;
  currency: string;
  status: string;
  qrCode: string | null;
  qrAlreadyUsed: boolean;
  createdAt: string;

  service: {
    name: string;
  };

  profile: {
    businessName: string;
    city: string;
    address: string | null;
  };

  payment: {
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
    verifiedAt: string | null;
  } | null;
};

// ======================================================
// HELPERS
// ======================================================

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lome",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lome",
  }).format(new Date(value));
}

function formatAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency}`;
}

function getStatus(status: string, qrAlreadyUsed: boolean) {
  if (qrAlreadyUsed) {
    return {
      label: "Ticket utilisé",
      className: "bg-blue-50 text-blue-700",
    };
  }

  switch (status) {
    case "CONFIRMED":
      return {
        label: "Confirmée",
        className: "bg-green-50 text-green-700",
      };

    case "COMPLETED":
      return {
        label: "Terminée",
        className: "bg-blue-50 text-blue-700",
      };

    case "PENDING_PAYMENT":
      return {
        label: "En attente de paiement",
        className: "bg-amber-50 text-amber-700",
      };

    case "CANCELLED":
      return {
        label: "Annulée",
        className: "bg-red-50 text-red-700",
      };

    case "EXPIRED":
      return {
        label: "Expirée",
        className: "bg-zinc-100 text-zinc-600",
      };

    case "REFUNDED":
      return {
        label: "Remboursée",
        className: "bg-purple-50 text-purple-700",
      };

    default:
      return {
        label: status,
        className: "bg-zinc-100 text-zinc-600",
      };
  }
}

// ======================================================
// DASHBOARD
// ======================================================

export default function ClientDashboardPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ====================================================
  // CHARGEMENT DES DONNÉES
  // ====================================================

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/client/tickets", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de charger votre tableau de bord."
        );
      }

      setTickets(data.tickets || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ====================================================
  // STATISTIQUES
  // ====================================================

  const totalBookings = tickets.length;

  const availableTickets = tickets.filter(
    (ticket) =>
      ticket.qrCode !== null &&
      !ticket.qrAlreadyUsed &&
      ticket.status === "CONFIRMED"
  ).length;

  const pendingBookings = tickets.filter(
    (ticket) => ticket.status === "PENDING_PAYMENT"
  ).length;

  const completedBookings = tickets.filter(
    (ticket) => ticket.status === "COMPLETED"
  ).length;

  const now = Date.now();

  const upcomingBookings = tickets
    .filter(
      (ticket) =>
        ticket.status === "CONFIRMED" &&
        !ticket.qrAlreadyUsed &&
        new Date(ticket.startsAt).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() -
        new Date(b.startsAt).getTime()
    );

  const recentBookings = [...tickets]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  // ====================================================
  // AFFICHAGE
  // ====================================================

  return (
    <div className="mx-auto max-w-6xl space-y-8">

      {/* EN-TÊTE */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 text-sm font-semibold text-amber-600">
            RESERVE X · ESPACE CLIENT
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Tableau de bord
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Retrouvez ici toutes les informations concernant vos réservations.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Actualiser
        </button>
      </div>

      {/* ERREUR */}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* RACCOURCI RÉSERVATION */}

      <div className="flex flex-col justify-between gap-5 rounded-2xl bg-zinc-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Search size={22} />
          </div>

          <h2 className="text-xl font-bold">
            Envie de découvrir de nouveaux établissements ?
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Explorez les établissements disponibles sur Reserve X et réservez vos prochaines prestations en quelques étapes.
          </p>
        </div>

        <Link
          href="/recherche"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
        >
          Explorer
          <ArrowRight size={17} />
        </Link>
      </div>

      {/* SERVICE CLIENT */}

      <section>
        <a
          href="https://wa.me/22898126142"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter le service client Reserve X sur WhatsApp"
          className="group flex flex-col justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300 sm:flex-row sm:items-center sm:p-6"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Headset size={23} />
            </div>

            <div>
              <h2 className="font-bold text-zinc-900">
                Besoin d'aide ?
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Notre service client est disponible pour vous accompagner.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-white transition group-hover:bg-amber-600">
            Contacter le service client
            <ArrowRight size={17} />
          </span>
        </a>
      </section>

      {/* STATISTIQUES */}

      <div>
        <h2 className="mb-4 text-lg font-bold text-zinc-900">
          Vue d'ensemble
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Réservations",
              value: totalBookings,
              icon: CalendarDays,
              color: "bg-amber-50 text-amber-600",
            },
            {
              label: "Tickets disponibles",
              value: availableTickets,
              icon: Ticket,
              color: "bg-green-50 text-green-600",
            },
            {
              label: "En attente de paiement",
              value: pendingBookings,
              icon: Clock3,
              color: "bg-orange-50 text-orange-600",
            },
            {
              label: "Prestations terminées",
              value: completedBookings,
              icon: CheckCircle2,
              color: "bg-blue-50 text-blue-600",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">
                    {stat.label}
                  </span>

                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
                  >
                    <Icon size={20} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold text-zinc-900">
                  {loading ? "—" : stat.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">

        {/* DERNIÈRES RÉSERVATIONS */}

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 p-5">
            <h2 className="font-bold text-zinc-900">
              Dernières réservations
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Vos activités récentes sur Reserve X
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="animate-spin text-amber-500"
                size={28}
              />
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <CalendarDays
                size={32}
                className="mx-auto text-zinc-300"
              />

              <p className="mt-4 font-semibold text-zinc-800">
                Aucune réservation pour le moment
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Vos prochaines réservations apparaîtront ici.
              </p>

              <Link
                href="/recherche"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-600"
              >
                Découvrir les établissements
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recentBookings.map((ticket) => {
                const status = getStatus(
                  ticket.status,
                  ticket.qrAlreadyUsed
                );

                return (
                  <div
                    key={ticket.id}
                    className="flex flex-col justify-between gap-4 p-5 transition hover:bg-zinc-50 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Ticket size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-bold text-zinc-900">
                          {ticket.profile.businessName}
                        </p>

                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {ticket.service.name}
                        </p>

                        <p className="mt-2 text-xs text-zinc-400">
                          {formatDate(ticket.startsAt)} · {formatTime(ticket.startsAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>

                      <span className="text-sm font-bold text-zinc-800">
                        {formatAmount(ticket.amount, ticket.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PROCHAINES RÉSERVATIONS */}

        <section className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 p-5">
            <h2 className="font-bold text-zinc-900">
              Prochaines réservations
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Vos prochains rendez-vous confirmés
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="animate-spin text-amber-500"
                size={28}
              />
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Clock3
                size={30}
                className="mx-auto text-zinc-300"
              />

              <p className="mt-4 text-sm font-semibold text-zinc-800">
                Rien de prévu pour le moment
              </p>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Vos prochaines réservations confirmées apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {upcomingBookings.slice(0, 4).map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-zinc-900">
                        {ticket.profile.businessName}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {ticket.service.name}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <CalendarDays size={18} />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-amber-500" />
                      {formatDate(ticket.startsAt)}
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock3 size={14} className="text-amber-500" />
                      {formatTime(ticket.startsAt)}
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-amber-500" />
                      {ticket.profile.city}
                    </div>
                  </div>

                  {ticket.qrCode && (
                    <Link
                      href="/client/tickets"
                      className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                    >
                      <QrCode size={15} />
                      Voir mon ticket
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ACCÈS RAPIDES */}

      <section>
        <h2 className="mb-4 text-lg font-bold text-zinc-900">
          Accès rapides
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/client/tickets"
            className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Ticket size={21} />
            </div>

            <div className="flex-1">
              <p className="font-bold text-zinc-900">
                Mes tickets
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Retrouver mes QR codes
              </p>
            </div>

            <ArrowRight
              size={17}
              className="text-zinc-400 transition group-hover:translate-x-1 group-hover:text-amber-600"
            />
          </Link>

          <Link
            href="/client/avis"
            className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle2 size={21} />
            </div>

            <div className="flex-1">
              <p className="font-bold text-zinc-900">
                Mes avis
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Donner mon avis
              </p>
            </div>

            <ArrowRight
              size={17}
              className="text-zinc-400 transition group-hover:translate-x-1 group-hover:text-amber-600"
            />
          </Link>
        </div>
      </section>

    </div>
  );
}