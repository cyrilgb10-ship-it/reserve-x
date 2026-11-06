import { connection } from "next/server";
import Link from "next/link";

import {
  CalendarDays,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Building2,
  UserRound,
  ArrowUpRight,
  Ticket,
  RefreshCw,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

type ReservationsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

const bookingStatuses = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
] as const;

function formatMoney(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency}`;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function bookingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: "En attente de paiement",
    CONFIRMED: "Confirmée",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
    EXPIRED: "Expirée",
    REFUNDED: "Remboursée",
  };

  return labels[status] ?? status;
}

function bookingStatusStyle(status: string) {
  const styles: Record<string, string> = {
    PENDING_PAYMENT: "bg-amber-50 text-amber-700",
    CONFIRMED: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-700",
    EXPIRED: "bg-slate-100 text-slate-600",
    REFUNDED: "bg-purple-50 text-purple-700",
  };

  return styles[status] ?? "bg-slate-100 text-slate-600";
}

function paymentStatusLabel(status?: string) {
  if (!status) return "Aucun paiement";

  const labels: Record<string, string> = {
    PENDING: "En attente",
    SUCCESS: "Payé",
    FAILED: "Échoué",
    CANCELLED: "Annulé",
    REFUNDED: "Remboursé",
  };

  return labels[status] ?? status;
}

function paymentStatusStyle(status?: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    SUCCESS: "bg-emerald-50 text-emerald-700",
    FAILED: "bg-red-50 text-red-700",
    CANCELLED: "bg-slate-100 text-slate-600",
    REFUNDED: "bg-purple-50 text-purple-700",
  };

  return styles[status ?? ""] ?? "bg-slate-100 text-slate-600";
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-[#e5edf5] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#64748b]">{title}</p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#061b31]">
            {value.toLocaleString("fr-FR")}
          </p>

          <p className="mt-2 text-xs text-[#94a3b8]">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f1f3ff] text-[#533afd]">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

export default async function ReservationsPage({
  searchParams,
}: ReservationsPageProps) {
  await connection();

  const params = await searchParams;

  const search = params.q?.trim() ?? "";
  const requestedStatus = params.status ?? "all";

  const selectedStatus = bookingStatuses.includes(
    requestedStatus as (typeof bookingStatuses)[number]
  )
    ? requestedStatus
    : "all";

  const where = {
    ...(selectedStatus !== "all"
      ? {
          status: selectedStatus as (typeof bookingStatuses)[number],
        }
      : {}),

    ...(search
      ? {
          OR: [
            {
              reference: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              customerFirstName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              customerLastName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              customerEmail: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              customerPhone: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              profile: {
                businessName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              service: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  const [
    totalReservations,
    pendingReservations,
    confirmedReservations,
    completedReservations,
    cancelledReservations,
    reservations,
  ] = await Promise.all([
    prisma.booking.count(),

    prisma.booking.count({
      where: {
        status: "PENDING_PAYMENT",
      },
    }),

    prisma.booking.count({
      where: {
        status: "CONFIRMED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "COMPLETED",
      },
    }),

    prisma.booking.count({
      where: {
        status: {
          in: ["CANCELLED", "EXPIRED"],
        },
      },
    }),

    prisma.booking.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      take: 50,

      include: {
        profile: {
          select: {
            businessName: true,
            slug: true,
          },
        },

        service: {
          select: {
            name: true,
          },
        },

        customer: {
          select: {
            name: true,
            email: true,
          },
        },

        payments: {
          orderBy: {
            attemptNumber: "desc",
          },

          select: {
            id: true,
            attemptNumber: true,
            amount: true,
            currency: true,
            status: true,
            provider: true,
            network: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2 text-sm text-[#64748b]">
          <Link
            href="/admin"
            className="transition hover:text-[#533afd]"
          >
            Administration
          </Link>

          <span>/</span>

          <span className="text-[#061b31]">Réservations</span>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#061b31]">
              Réservations
            </h1>

            <p className="mt-2 text-sm text-[#64748b]">
              Consultez et suivez les réservations effectuées sur Reserve X.
            </p>
          </div>

          <span className="text-sm text-[#64748b]">
            {reservations.length} résultat(s) affiché(s) sur un maximum de 50
          </span>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total des réservations"
          value={totalReservations}
          description="Toutes les réservations"
          icon={Ticket}
        />

        <StatCard
          title="En attente"
          value={pendingReservations}
          description="En attente de paiement"
          icon={Clock}
        />

        <StatCard
          title="Confirmées"
          value={confirmedReservations}
          description="Paiements confirmés"
          icon={CheckCircle2}
        />

        <StatCard
          title="Terminées"
          value={completedReservations}
          description="Prestations réalisées"
          icon={CalendarDays}
        />
      </div>

      {/* Recherche et filtres */}
      <div className="rounded-xl border border-[#e5edf5] bg-white p-5">
        <form
          action="/admin/reservations"
          method="GET"
          className="flex flex-col gap-3 lg:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />

            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Référence, client, téléphone ou établissement..."
              className="h-11 w-full rounded-lg border border-[#e5edf5] bg-white pl-10 pr-4 text-sm text-[#061b31] outline-none transition placeholder:text-[#94a3b8] focus:border-[#533afd]"
            />
          </div>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-11 rounded-lg border border-[#e5edf5] bg-white px-4 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
          >
            <option value="all">Tous les statuts</option>
            <option value="PENDING_PAYMENT">En attente de paiement</option>
            <option value="CONFIRMED">Confirmées</option>
            <option value="COMPLETED">Terminées</option>
            <option value="CANCELLED">Annulées</option>
            <option value="EXPIRED">Expirées</option>
            <option value="REFUNDED">Remboursées</option>
          </select>

          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#533afd] px-5 text-sm font-medium text-white transition hover:bg-[#4230d4]"
          >
            <Search size={16} />
            Rechercher
          </button>

          {(search || selectedStatus !== "all") && (
            <Link
              href="/admin/reservations"
              className="flex h-11 items-center justify-center rounded-lg border border-[#e5edf5] px-5 text-sm text-[#64748b] transition hover:bg-[#f8fafd]"
            >
              Réinitialiser
            </Link>
          )}
        </form>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-[#e5edf5] bg-white">
        <div className="flex flex-col justify-between gap-2 border-b border-[#e5edf5] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-[#061b31]">
              Liste des réservations
            </h2>

            <p className="mt-1 text-xs text-[#94a3b8]">
              Les réservations les plus récentes sont affichées en premier.
            </p>
          </div>

          <span className="text-sm text-[#64748b]">
            {reservations.length} réservation(s)
          </span>
        </div>

        {reservations.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f8fafd] text-[#94a3b8]">
              <CalendarDays size={24} />
            </div>

            <h3 className="mt-4 font-medium text-[#061b31]">
              Aucune réservation trouvée
            </h3>

            <p className="mt-2 text-sm text-[#94a3b8]">
              Essayez de modifier vos critères de recherche.
            </p>
          </div>
        ) : (
          <>
            {/* Version ordinateur */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#e5edf5] bg-[#f8fafd] text-xs uppercase tracking-wide text-[#64748b]">
                    <th className="px-5 py-4 font-medium">Réservation</th>
                    <th className="px-5 py-4 font-medium">Client</th>
                    <th className="px-5 py-4 font-medium">Établissement</th>
                    <th className="px-5 py-4 font-medium">Prestation</th>
                    <th className="px-5 py-4 font-medium">Montant</th>
                    <th className="px-5 py-4 font-medium">Paiement</th>
                    <th className="px-5 py-4 font-medium">Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {reservations.map((booking) => {
                    const payment = booking.payments.find(
                      (item) =>
                        item.attemptNumber === booking.paymentAttempt
                    );

                    const customerName = [
                      booking.customerFirstName,
                      booking.customerLastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <tr
                        key={booking.id}
                        className="border-b border-[#e5edf5] last:border-0 transition hover:bg-[#fbfcfe]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-[#061b31]">
                            {booking.reference}
                          </p>

                          <p className="mt-1 text-xs text-[#94a3b8]">
                            {formatDate(booking.createdAt)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <UserRound
                              size={16}
                              className="shrink-0 text-[#94a3b8]"
                            />

                            <div>
                              <p className="text-sm font-medium text-[#061b31]">
                                {customerName || booking.customer?.name || "Client"}
                              </p>

                              <p className="mt-1 text-xs text-[#94a3b8]">
                                {booking.customerEmail ||
                                  booking.customer?.email ||
                                  booking.customerPhone ||
                                  "Coordonnées non renseignées"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2
                              size={16}
                              className="shrink-0 text-[#94a3b8]"
                            />

                            <span className="text-sm text-[#475569]">
                              {booking.profile.businessName}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-[#475569]">
                            {booking.service.name}
                          </p>

                          <p className="mt-1 text-xs text-[#94a3b8]">
                            Quantité : {booking.quantity}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#061b31]">
                            {formatMoney(
                              booking.amount,
                              booking.currency
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusStyle(payment?.status)}`}
                          >
                            {paymentStatusLabel(payment?.status)}
                          </span>

                          {payment && (
                            <p className="mt-1 text-xs text-[#94a3b8]">
                              Tentative {payment.attemptNumber}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${bookingStatusStyle(booking.status)}`}
                          >
                            {bookingStatusLabel(booking.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Version mobile */}
            <div className="divide-y divide-[#e5edf5] md:hidden">
              {reservations.map((booking) => {
                const payment = booking.payments.find(
                  (item) =>
                    item.attemptNumber === booking.paymentAttempt
                );

                const customerName = [
                  booking.customerFirstName,
                  booking.customerLastName,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div key={booking.id} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#061b31]">
                          {booking.reference}
                        </p>

                        <p className="mt-1 text-xs text-[#94a3b8]">
                          {formatDate(booking.createdAt)}
                        </p>
                      </div>

                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-[#94a3b8]"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <UserRound
                          size={16}
                          className="mt-0.5 shrink-0 text-[#94a3b8]"
                        />

                        <div>
                          <p className="text-sm font-medium text-[#061b31]">
                            {customerName || booking.customer?.name || "Client"}
                          </p>

                          <p className="mt-1 text-xs text-[#94a3b8]">
                            {booking.customerEmail ||
                              booking.customer?.email ||
                              booking.customerPhone ||
                              "Coordonnées non renseignées"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Building2
                          size={16}
                          className="mt-0.5 shrink-0 text-[#94a3b8]"
                        />

                        <div>
                          <p className="text-sm text-[#475569]">
                            {booking.profile.businessName}
                          </p>

                          <p className="mt-1 text-xs text-[#94a3b8]">
                            {booking.service.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CalendarDays
                          size={16}
                          className="mt-0.5 shrink-0 text-[#94a3b8]"
                        />

                        <div>
                          <p className="text-sm text-[#475569]">
                            Date prévue : {formatDate(booking.startsAt)}
                          </p>

                          <p className="mt-1 text-xs text-[#94a3b8]">
                            Quantité : {booking.quantity}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5edf5] pt-3">
                      <div>
                        <p className="text-xs text-[#94a3b8]">Montant</p>

                        <p className="mt-1 font-semibold text-[#061b31]">
                          {formatMoney(
                            booking.amount,
                            booking.currency
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${bookingStatusStyle(booking.status)}`}
                        >
                          {bookingStatusLabel(booking.status)}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusStyle(payment?.status)}`}
                        >
                          {paymentStatusLabel(payment?.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Information */}
      <div className="flex items-start gap-3 rounded-xl border border-[#e5edf5] bg-[#f8fafd] p-4">
        <RefreshCw
          size={18}
          className="mt-0.5 shrink-0 text-[#533afd]"
        />

        <div>
          <p className="text-sm font-medium text-[#061b31]">
            Suivi des tentatives de paiement
          </p>

          <p className="mt-1 text-xs leading-5 text-[#64748b]">
            Le statut du paiement affiché correspond uniquement à la tentative
            associée au numéro de tentative actuellement enregistré sur la
            réservation. Une ancienne tentative de paiement ne doit pas être
            considérée comme valide pour cette réservation.
          </p>
        </div>
      </div>

      {/* Statistiques complémentaires */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-[#e5edf5] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fef2f2] text-[#dc2626]">
            <XCircle size={20} />
          </div>

          <div>
            <p className="text-sm text-[#64748b]">
              Annulées ou expirées
            </p>

            <p className="mt-1 text-xl font-semibold text-[#061b31]">
              {cancelledReservations.toLocaleString("fr-FR")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#e5edf5] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2ff] text-[#533afd]">
            <CreditCard size={20} />
          </div>

          <div>
            <p className="text-sm text-[#64748b]">
              Réservations remboursées
            </p>

            <p className="mt-1 text-xl font-semibold text-[#061b31]">
              {await prisma.booking.count({
                where: {
                  status: "REFUNDED",
                },
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}