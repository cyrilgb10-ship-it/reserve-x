import { connection } from "next/server";
import Link from "next/link";

import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Building2,
  CalendarDays,
  Smartphone,
  Receipt,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
  }>;
};

type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

type Transaction = {
  id: string;
  type: "BOOKING" | "SUBSCRIPTION";
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerPaymentId: string | null;
  network: string | null;
  customerPhone: string | null;
  paidAt: Date | null;
  createdAt: Date;
  businessName: string;
  reference: string;
  attemptNumber?: number;
  isCurrent?: boolean;
  isAbandoned?: boolean;
};

const paymentStatuses: PaymentStatus[] = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
];

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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    SUCCESS: "Réussi",
    FAILED: "Échoué",
    CANCELLED: "Annulé",
    REFUNDED: "Remboursé",
  };

  return labels[status] ?? status;
}

function statusStyle(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    SUCCESS: "bg-emerald-50 text-emerald-700",
    FAILED: "bg-red-50 text-red-700",
    CANCELLED: "bg-slate-100 text-slate-600",
    REFUNDED: "bg-purple-50 text-purple-700",
  };

  return styles[status] ?? "bg-slate-100 text-slate-600";
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

          <p className="mt-2 text-xs text-[#94a3b8]">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f1f3ff] text-[#533afd]">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  await connection();

  const params = await searchParams;

  const search = params.q?.trim() ?? "";
  const requestedStatus = params.status ?? "all";
  const requestedType = params.type ?? "all";

  const selectedStatus = paymentStatuses.includes(
    requestedStatus as PaymentStatus
  )
    ? requestedStatus
    : "all";

  const selectedType = ["BOOKING", "SUBSCRIPTION"].includes(
    requestedType
  )
    ? requestedType
    : "all";

  /*
   * Récupération des paiements de réservation.
   *
   * Toutes les tentatives sont conservées pour permettre
   * de distinguer les anciennes tentatives de la dernière.
   */
  const bookingPayments = await prisma.payment.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      booking: {
        select: {
          id: true,
          reference: true,
          paymentAttempt: true,
          customerFirstName: true,
          customerLastName: true,
          customerPhone: true,
          customerEmail: true,

          profile: {
            select: {
              businessName: true,
            },
          },
        },
      },
    },
  });

  /*
   * Récupération des paiements d'abonnement.
   */
  const subscriptionPayments =
    await prisma.subscriptionPayment.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        profile: {
          select: {
            businessName: true,
          },
        },
      },
    });

  /*
   * Normalisation des transactions.
   */
  const bookingTransactions: Transaction[] = bookingPayments.map(
    (payment) => ({
      id: payment.id,
      type: "BOOKING",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      providerPaymentId: payment.providerPaymentId,
      network: payment.network,
      customerPhone:
        payment.customerPhone ||
        payment.booking.customerPhone,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      businessName: payment.booking.profile.businessName,
      reference: payment.booking.reference,
      attemptNumber: payment.attemptNumber,
      isCurrent:
        payment.attemptNumber ===
        payment.booking.paymentAttempt,
    })
  );

  const subscriptionTransactions: Transaction[] =
    subscriptionPayments.map((payment) => ({
      id: payment.id,
      type: "SUBSCRIPTION",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      providerPaymentId: payment.providerPaymentId,
      network: payment.network,
      customerPhone: payment.customerPhone,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      businessName: payment.profile.businessName,
      reference: payment.providerPaymentId || payment.id,
      isAbandoned: payment.isAbandoned,
    }));

  /*
   * Fusion et tri des transactions.
   */
  const allTransactions = [
    ...bookingTransactions,
    ...subscriptionTransactions,
  ].sort(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
  );

  /*
   * Seules les transactions valides entrent dans les statistiques.
   *
   * Pour les réservations : seule la dernière tentative compte.
   * Pour les abonnements : les tentatives abandonnées sont exclues.
   */
  const validTransactions = allTransactions.filter(
    (transaction) => {
      if (transaction.type === "BOOKING") {
        return transaction.isCurrent === true;
      }

      return transaction.isAbandoned !== true;
    }
  );

  const successfulTransactions = validTransactions.filter(
    (transaction) => transaction.status === "SUCCESS"
  );

  const pendingTransactions = validTransactions.filter(
    (transaction) => transaction.status === "PENDING"
  );

  const failedTransactions = validTransactions.filter(
    (transaction) =>
      transaction.status === "FAILED" ||
      transaction.status === "CANCELLED"
  );

  const refundedTransactions = validTransactions.filter(
    (transaction) => transaction.status === "REFUNDED"
  );

  /*
   * Recherche et filtres.
   */
  const filteredTransactions = allTransactions.filter(
    (transaction) => {
      const matchesStatus =
        selectedStatus === "all" ||
        transaction.status === selectedStatus;

      const matchesType =
        selectedType === "all" ||
        transaction.type === selectedType;

      const matchesSearch =
        !search ||
        [
          transaction.reference,
          transaction.providerPaymentId,
          transaction.businessName,
          transaction.customerPhone,
          transaction.network,
        ]
          .filter(Boolean)
          .some((value) =>
            value!.toLowerCase().includes(search.toLowerCase())
          );

      return (
        matchesStatus &&
        matchesType &&
        matchesSearch
      );
    }
  );

  const displayedTransactions = filteredTransactions.slice(0, 100);

  /*
   * Montant total réellement encaissé selon les transactions
   * valides et confirmées.
   */
  const totalSuccessfulAmount = successfulTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  );

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

          <span className="text-[#061b31]">
            Paiements
          </span>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#061b31]">
              Paiements
            </h1>

            <p className="mt-2 text-sm text-[#64748b]">
              Suivez les transactions SasPay des réservations et des abonnements.
            </p>
          </div>

          <span className="text-sm text-[#64748b]">
            {displayedTransactions.length} transaction(s) affichée(s)
            {" "}sur {filteredTransactions.length}
          </span>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Montant encaissé"
          value={totalSuccessfulAmount}
          description="Transactions valides confirmées (FCFA)"
          icon={Wallet}
        />

        <StatCard
          title="Paiements réussis"
          value={successfulTransactions.length}
          description="Dernières tentatives valides"
          icon={CheckCircle2}
        />

        <StatCard
          title="En attente"
          value={pendingTransactions.length}
          description="Transactions en cours"
          icon={Clock}
        />

        <StatCard
          title="Échoués ou annulés"
          value={failedTransactions.length}
          description="Transactions non abouties"
          icon={XCircle}
        />
      </div>

      {/* Statistiques complémentaires */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <RefreshCw size={20} />
            </div>

            <div>
              <p className="text-sm text-[#64748b]">
                Paiements remboursés
              </p>

              <p className="mt-1 text-xl font-semibold text-[#061b31]">
                {refundedTransactions.length.toLocaleString("fr-FR")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f1f3ff] text-[#533afd]">
              <Receipt size={20} />
            </div>

            <div>
              <p className="text-sm text-[#64748b]">
                Total des transactions enregistrées
              </p>

              <p className="mt-1 text-xl font-semibold text-[#061b31]">
                {allTransactions.length.toLocaleString("fr-FR")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="rounded-xl border border-[#e5edf5] bg-white p-5">
        <form
          action="/admin/paiements"
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_190px_190px_auto]"
        >
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />

            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Référence, établissement, téléphone ou transaction..."
              className="h-11 w-full rounded-lg border border-[#e5edf5] bg-white pl-10 pr-4 text-sm text-[#061b31] outline-none transition placeholder:text-[#94a3b8] focus:border-[#533afd]"
            />
          </div>

          <select
            name="type"
            defaultValue={selectedType}
            className="h-11 rounded-lg border border-[#e5edf5] bg-white px-4 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
          >
            <option value="all">Tous les types</option>
            <option value="BOOKING">Réservations</option>
            <option value="SUBSCRIPTION">Abonnements</option>
          </select>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-11 rounded-lg border border-[#e5edf5] bg-white px-4 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
          >
            <option value="all">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="SUCCESS">Réussi</option>
            <option value="FAILED">Échoué</option>
            <option value="CANCELLED">Annulé</option>
            <option value="REFUNDED">Remboursé</option>
          </select>

          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#533afd] px-5 text-sm font-medium text-white transition hover:bg-[#4230d4]"
          >
            <Search size={16} />
            Filtrer
          </button>
        </form>

        {(search ||
          selectedStatus !== "all" ||
          selectedType !== "all") && (
          <div className="mt-3">
            <Link
              href="/admin/paiements"
              className="text-sm text-[#533afd] hover:underline"
            >
              Réinitialiser les filtres
            </Link>
          </div>
        )}
      </div>

      {/* Liste des transactions */}
      <div className="overflow-hidden rounded-xl border border-[#e5edf5] bg-white">
        <div className="flex flex-col justify-between gap-2 border-b border-[#e5edf5] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-[#061b31]">
              Historique des transactions
            </h2>

            <p className="mt-1 text-xs text-[#94a3b8]">
              Les transactions les plus récentes sont affichées en premier.
            </p>
          </div>

          <span className="text-sm text-[#64748b]">
            {displayedTransactions.length} transaction(s)
          </span>
        </div>

        {displayedTransactions.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f8fafd] text-[#94a3b8]">
              <CreditCard size={24} />
            </div>

            <h3 className="mt-4 font-medium text-[#061b31]">
              Aucune transaction trouvée
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
                    <th className="px-5 py-4 font-medium">
                      Transaction
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Établissement
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Type
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Montant
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Opérateur
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Statut
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {displayedTransactions.map((transaction) => {
                    const obsolete =
                      transaction.type === "BOOKING" &&
                      !transaction.isCurrent;

                    const abandoned =
                      transaction.type === "SUBSCRIPTION" &&
                      transaction.isAbandoned;

                    return (
                      <tr
                        key={`${transaction.type}-${transaction.id}`}
                        className="border-b border-[#e5edf5] last:border-0 transition hover:bg-[#fbfcfe]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-[#061b31]">
                            {transaction.type === "BOOKING"
                              ? transaction.reference
                              : transaction.reference}
                          </p>

                          <p className="mt-1 text-xs text-[#94a3b8]">
                            {formatDate(transaction.createdAt)}
                          </p>

                          {transaction.providerPaymentId && (
                            <p className="mt-1 max-w-[180px] truncate text-xs text-[#94a3b8]">
                              SasPay : {transaction.providerPaymentId}
                            </p>
                          )}

                          {transaction.type === "BOOKING" &&
                            transaction.attemptNumber !== undefined && (
                              <p className="mt-1 text-xs text-[#64748b]">
                                Tentative {transaction.attemptNumber}
                              </p>
                            )}

                          {obsolete && (
                            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Ancienne tentative
                            </span>
                          )}

                          {abandoned && (
                            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Abandonnée
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2
                              size={16}
                              className="shrink-0 text-[#94a3b8]"
                            />

                            <span className="text-sm text-[#475569]">
                              {transaction.businessName}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {transaction.type === "BOOKING" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              <CalendarDays size={13} />
                              Réservation
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                              <Wallet size={13} />
                              Abonnement
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#061b31]">
                            {formatMoney(
                              transaction.amount,
                              transaction.currency
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Smartphone
                              size={15}
                              className="shrink-0 text-[#94a3b8]"
                            />

                            <div>
                              <p className="text-sm text-[#475569]">
                                {transaction.network || "SasPay"}
                              </p>

                              <p className="mt-1 text-xs text-[#94a3b8]">
                                {transaction.customerPhone ||
                                  "Téléphone non renseigné"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(transaction.status)}`}
                          >
                            {statusLabel(transaction.status)}
                          </span>

                          {transaction.paidAt && (
                            <p className="mt-1 text-xs text-[#94a3b8]">
                              Payé le {formatDate(transaction.paidAt)}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Version mobile */}
            <div className="divide-y divide-[#e5edf5] md:hidden">
              {displayedTransactions.map((transaction) => {
                const obsolete =
                  transaction.type === "BOOKING" &&
                  !transaction.isCurrent;

                const abandoned =
                  transaction.type === "SUBSCRIPTION" &&
                  transaction.isAbandoned;

                return (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className="space-y-4 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#061b31]">
                          {transaction.reference}
                        </p>

                        <p className="mt-1 text-xs text-[#94a3b8]">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>

                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-[#94a3b8]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-[#475569]">
                        <Building2
                          size={15}
                          className="text-[#94a3b8]"
                        />

                        {transaction.businessName}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-[#475569]">
                        <Smartphone
                          size={15}
                          className="text-[#94a3b8]"
                        />

                        {transaction.network || "SasPay"}
                        {" · "}
                        {transaction.customerPhone || "Téléphone non renseigné"}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5edf5] pt-3">
                      <div>
                        <p className="text-xs text-[#94a3b8]">
                          Montant
                        </p>

                        <p className="mt-1 font-semibold text-[#061b31]">
                          {formatMoney(
                            transaction.amount,
                            transaction.currency
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(transaction.status)}`}
                        >
                          {statusLabel(transaction.status)}
                        </span>

                        <span className="text-xs text-[#64748b]">
                          {transaction.type === "BOOKING"
                            ? "Réservation"
                            : "Abonnement"}
                        </span>
                      </div>
                    </div>

                    {transaction.providerPaymentId && (
                      <p className="break-all text-xs text-[#94a3b8]">
                        Référence SasPay : {transaction.providerPaymentId}
                      </p>
                    )}

                    {transaction.type === "BOOKING" && (
                      <p className="text-xs text-[#64748b]">
                        Tentative {transaction.attemptNumber}
                      </p>
                    )}

                    {obsolete && (
                      <p className="text-xs font-medium text-amber-700">
                        Ancienne tentative : ne compte pas dans les statistiques.
                      </p>
                    )}

                    {abandoned && (
                      <p className="text-xs font-medium text-slate-600">
                        Transaction abandonnée : exclue des statistiques.
                      </p>
                    )}
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
            Fiabilité des paiements
          </p>

          <p className="mt-1 text-xs leading-5 text-[#64748b]">
            Les anciennes tentatives de paiement des réservations et les
            transactions d'abonnement abandonnées restent consultables dans
            l'historique. Elles sont toutefois exclues des statistiques
            financières. Seules les dernières tentatives valides sont prises
            en compte.
          </p>
        </div>
      </div>
    </div>
  );
}