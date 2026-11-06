import Link from "next/link";

import {
  Users,
  Building2,
  CalendarDays,
  CreditCard,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Star,
  Receipt,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group border border-[#e5edf5] bg-white p-5 transition hover:border-[#b9b9f9]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-[#061b31]">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded bg-[#533afd]/10">
          <Icon className="h-5 w-5 text-[#533afd]" />
        </span>
      </div>

      <div className="mt-5 flex items-center justify-end">
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-[#533afd]" />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CONFIRMED: "bg-blue-50 text-blue-700",
    PENDING_PAYMENT: "bg-amber-50 text-amber-700",
    CANCELLED: "bg-red-50 text-red-600",
    EXPIRED: "bg-slate-100 text-slate-600",
    REFUNDED: "bg-purple-50 text-purple-700",
    PENDING: "bg-amber-50 text-amber-700",
    PROCESSING: "bg-blue-50 text-blue-700",
    PAID: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-600",
  };

  const labels: Record<string, string> = {
    COMPLETED: "Terminée",
    CONFIRMED: "Confirmée",
    PENDING_PAYMENT: "En attente de paiement",
    CANCELLED: "Annulée",
    EXPIRED: "Expirée",
    REFUNDED: "Remboursée",
    PENDING: "En attente",
    PROCESSING: "En traitement",
    PAID: "Payé",
    REJECTED: "Refusé",
  };

  return (
    <span
      className={`inline-flex rounded px-2.5 py-1 text-[11px] font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default async function AdminDashboardPage() {
  const [
    professionals,
    clients,
    totalBookings,
    completedBookings,
    pendingBookings,
    publishedProfiles,
    totalReviews,
    pendingWithdrawals,
    processingWithdrawals,
    recentProfessionals,
    recentBookings,
    recentWithdrawals,
    successfulBookingPayments,
    successfulSubscriptionPayments,
    activeSubscriptions,
  ] = await Promise.all([
    // Nombre de comptes professionnels
    prisma.user.count({
      where: {
        role: "PROFESSIONAL",
      },
    }),

    // Nombre de clients
    prisma.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),

    // Toutes les réservations
    prisma.booking.count(),

    // Prestations terminées
    prisma.booking.count({
      where: {
        status: "COMPLETED",
      },
    }),

    // Réservations à suivre
    prisma.booking.count({
      where: {
        status: {
          in: ["PENDING_PAYMENT", "CONFIRMED"],
        },
      },
    }),

    // Établissements publiés
    prisma.professionalProfile.count({
      where: {
        isPublished: true,
      },
    }),

    // Avis clients
    prisma.review.count(),

    // Retraits en attente
    prisma.withdrawal.count({
      where: {
        status: "PENDING",
      },
    }),

    // Retraits en cours de traitement
    prisma.withdrawal.count({
      where: {
        status: "PROCESSING",
      },
    }),

    // Derniers professionnels inscrits
    prisma.user.findMany({
      where: {
        role: "PROFESSIONAL",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            businessName: true,
            city: true,
          },
        },
      },
    }),

    // Dernières réservations
    prisma.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        reference: true,
        customerFirstName: true,
        customerLastName: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            businessName: true,
          },
        },
      },
    }),

    // Dernières demandes de retrait
    prisma.withdrawal.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        reference: true,
        amount: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        wallet: {
          select: {
            profile: {
              select: {
                businessName: true,
              },
            },
          },
        },
      },
    }),

    // Paiements de réservation réussis
    prisma.payment.findMany({
      where: {
        status: "SUCCESS",
      },
      select: {
        amount: true,
        currency: true,
        attemptNumber: true,
        booking: {
          select: {
            paymentAttempt: true,
          },
        },
      },
    }),

    // Paiements d'abonnement réussis et non abandonnés
    prisma.subscriptionPayment.findMany({
      where: {
        status: "SUCCESS",
        isAbandoned: false,
      },
      select: {
        amount: true,
        currency: true,
      },
    }),

    // Abonnements actifs
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
      },
    }),
  ]);

  /*
   * IMPORTANT :
   * Une seule tentative de paiement par réservation
   * est comptabilisée : la dernière tentative créée.
   *
   * Une ancienne tentative réussie tardivement ne doit
   * pas être comptabilisée si elle a été abandonnée.
   */
  const validBookingPayments = successfulBookingPayments.filter(
    (payment) =>
      payment.attemptNumber === payment.booking.paymentAttempt
  );

  // Nombre de paiements de réservation valides
  const bookingPaymentCount = validBookingPayments.length;

  // Nombre de paiements d'abonnement valides
  const subscriptionPaymentCount =
    successfulSubscriptionPayments.length;

  // Nombre total de paiements confirmés
  const totalSuccessfulPayments =
    bookingPaymentCount + subscriptionPaymentCount;

  // Encaissements des réservations
  const bookingRevenue = validBookingPayments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  // Encaissements des abonnements
  const subscriptionRevenue = successfulSubscriptionPayments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  // Total des encaissements
  const totalPaymentRevenue =
    bookingRevenue + subscriptionRevenue;

  // Retraits non encore payés
  const totalWithdrawals =
    pendingWithdrawals + processingWithdrawals;

  // Statistiques principales
  const stats = [
    {
      title: "Professionnels",
      value: professionals,
      description: `${publishedProfiles} établissements publiés`,
      icon: Building2,
      href: "/admin/professionnels",
    },
    {
      title: "Clients",
      value: clients,
      description: "Comptes clients enregistrés",
      icon: Users,
      href: "/admin/clients",
    },
    {
      title: "Réservations",
      value: totalBookings,
      description: `${completedBookings} prestations terminées`,
      icon: CalendarDays,
      href: "/admin/reservations",
    },
    {
      title: "Paiements confirmés",
      value: totalSuccessfulPayments,
      description: `${bookingPaymentCount} réservations · ${subscriptionPaymentCount} abonnements`,
      icon: CreditCard,
      href: "/admin/paiements",
    },
    {
      title: "Revenus encaissés",
      value: formatMoney(totalPaymentRevenue),
      description: "Réservations et abonnements",
      icon: TrendingUp,
      href: "/admin/paiements",
    },
    {
      title: "Retraits à traiter",
      value: totalWithdrawals,
      description: `${pendingWithdrawals} en attente · ${processingWithdrawals} en cours`,
      icon: Wallet,
      href: "/admin/retraits",
    },
  ];

  return (
    <div className="space-y-8">

      {/* TITRE */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#533afd]">
            Vue d'ensemble
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#061b31]">
            Tableau de bord
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Supervisez l'activité et les opérations de Reserve X.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Mis à jour : {formatDate(new Date())}
        </div>
      </section>

      {/* STATISTIQUES */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#061b31]">
            Indicateurs principaux
          </h2>

          <span className="text-xs text-slate-400">
            Vue globale
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      {/* ACTIVITÉ RÉCENTE */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* PROFESSIONNELS */}
        <div className="border border-[#e5edf5] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5edf5] p-5">
            <div>
              <h2 className="font-bold text-[#061b31]">
                Nouveaux professionnels
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Les dernières inscriptions
              </p>
            </div>

            <Link
              href="/admin/professionnels"
              className="text-xs font-bold text-[#533afd] hover:underline"
            >
              Tout voir
            </Link>
          </div>

          <div className="divide-y divide-[#e5edf5]">
            {recentProfessionals.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                Aucun professionnel enregistré.
              </p>
            ) : (
              recentProfessionals.map((professional) => (
                <div
                  key={professional.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#533afd]/10 text-sm font-bold text-[#533afd]">
                      {professional.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#061b31]">
                        {professional.profile?.businessName ??
                          professional.name}
                      </p>

                      <p className="truncate text-xs text-slate-400">
                        {professional.profile?.city ??
                          professional.email}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDate(professional.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RÉSERVATIONS */}
        <div className="border border-[#e5edf5] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5edf5] p-5">
            <div>
              <h2 className="font-bold text-[#061b31]">
                Réservations récentes
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Dernières opérations enregistrées
              </p>
            </div>

            <Link
              href="/admin/reservations"
              className="text-xs font-bold text-[#533afd] hover:underline"
            >
              Tout voir
            </Link>
          </div>

          <div className="divide-y divide-[#e5edf5]">
            {recentBookings.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                Aucune réservation enregistrée.
              </p>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#061b31]">
                      {booking.customerFirstName}{" "}
                      {booking.customerLastName}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-400">
                      {booking.profile.businessName} ·{" "}
                      {booking.reference}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[#061b31]">
                      {formatMoney(booking.amount)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={booking.status} />

                    <span className="text-[11px] text-slate-400">
                      {formatDate(booking.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* RETRAITS ET INDICATEURS */}
      <section className="grid gap-6 xl:grid-cols-3">

        {/* RETRAITS */}
        <div className="border border-[#e5edf5] bg-white p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#061b31]">
                Demandes de retrait
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Dernières demandes des professionnels
              </p>
            </div>

            <Link
              href="/admin/retraits"
              className="text-xs font-bold text-[#533afd] hover:underline"
            >
              Gérer les retraits
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {recentWithdrawals.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Aucune demande de retrait.
              </p>
            ) : (
              recentWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between gap-4 border-b border-[#e5edf5] pb-4 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#061b31]">
                      {withdrawal.wallet.profile.businessName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {withdrawal.firstName} {withdrawal.lastName} ·{" "}
                      {withdrawal.reference}
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#061b31]">
                      {formatMoney(withdrawal.amount)}
                    </p>
                  </div>

                  <StatusBadge status={withdrawal.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* INDICATEURS SECONDAIRES */}
        <div className="space-y-4">

          {/* ABONNEMENTS */}
          <Link
            href="/admin/abonnements"
            className="block border border-[#e5edf5] bg-white p-5 transition hover:border-[#b9b9f9]"
          >
            <div className="flex items-center justify-between">
              <Receipt className="h-5 w-5 text-[#533afd]" />

              <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>

            <p className="mt-5 text-2xl font-bold text-[#061b31]">
              {activeSubscriptions}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Abonnements actifs
            </p>
          </Link>

          {/* AVIS */}
          <Link
            href="/admin/avis"
            className="block border border-[#e5edf5] bg-white p-5 transition hover:border-[#b9b9f9]"
          >
            <div className="flex items-center justify-between">
              <Star className="h-5 w-5 text-[#533afd]" />

              <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>

            <p className="mt-5 text-2xl font-bold text-[#061b31]">
              {totalReviews}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Avis clients publiés
            </p>
          </Link>

          {/* PRESTATIONS TERMINÉES */}
          <div className="border border-[#e5edf5] bg-white p-5">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />

              <span className="text-xs text-slate-400">
                Activité
              </span>
            </div>

            <p className="mt-5 text-2xl font-bold text-[#061b31]">
              {completedBookings}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Prestations terminées
            </p>
          </div>

          {/* RÉSERVATIONS À SUIVRE */}
          <div className="border border-[#e5edf5] bg-white p-5">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />

              <span className="text-xs text-slate-400">
                En cours
              </span>
            </div>

            <p className="mt-5 text-2xl font-bold text-[#061b31]">
              {pendingBookings}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Réservations à suivre
            </p>
          </div>
        </div>
      </section>

      {/* RÉCAPITULATIF FINANCIER */}
      <section className="border border-[#e5edf5] bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#533afd]/10">
            <TrendingUp className="h-5 w-5 text-[#533afd]" />
          </div>

          <div>
            <h2 className="font-bold text-[#061b31]">
              Récapitulatif des encaissements
            </h2>

            <p className="text-xs text-slate-400">
              Paiements confirmés enregistrés par la plateforme
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">
              Paiements de réservations
            </p>

            <p className="mt-2 text-2xl font-bold text-[#061b31]">
              {formatMoney(bookingRevenue)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Paiements d'abonnements
            </p>

            <p className="mt-2 text-2xl font-bold text-[#061b31]">
              {formatMoney(subscriptionRevenue)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Total encaissé
            </p>

            <p className="mt-2 text-2xl font-bold text-[#533afd]">
              {formatMoney(totalPaymentRevenue)}
            </p>
          </div>
        </div>

        <p className="mt-6 border-t border-[#e5edf5] pt-5 text-xs leading-6 text-slate-400">
          Ces montants correspondent aux paiements confirmés des dernières
          tentatives de réservation valides et aux paiements d'abonnement
          non abandonnés. Ils ne représentent pas nécessairement les revenus
          nets de Reserve X : les commissions, frais opérateurs et
          reversements professionnels doivent être distingués dans le
          module financier.
        </p>
      </section>
    </div>
  );
}