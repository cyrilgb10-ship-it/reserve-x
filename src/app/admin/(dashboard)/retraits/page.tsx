import Link from "next/link";
import { connection } from "next/server";

import {
  Search,
  RefreshCw,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Phone,
  CalendarDays,
  ArrowUpRight,
  Building2,
  User,
  Receipt,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  operator?: string;
}>;

function formatMoney(amount: number) {
  return (
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    PENDING: "En attente",
    PROCESSING: "En traitement",
    PAID: "Payé",
    REJECTED: "Rejeté",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${
        styles[status] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {status === "PENDING" && <Clock size={13} />}
      {status === "PROCESSING" && <RefreshCw size={13} />}
      {status === "PAID" && <CheckCircle2 size={13} />}
      {status === "REJECTED" && <XCircle size={13} />}

      {labels[status] || status}
    </span>
  );
}

function OperatorBadge({ operator }: { operator: string }) {
  const normalized = operator.toLowerCase();

  let label = operator;

  if (normalized.includes("moov")) {
    label = "Moov Money";
  } else if (
    normalized.includes("togo") ||
    normalized.includes("togocel") ||
    normalized.includes("mixx")
  ) {
    label = "Mixx by Yas";
  }

  return (
    <span className="inline-flex items-center rounded border border-[#e5edf5] bg-[#f8fafd] px-2.5 py-1 text-xs font-medium text-slate-600">
      {label}
    </span>
  );
}

export default async function AdminRetraitsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();

  const params = await searchParams;

  const query = (params.q || "").trim().toLowerCase();
  const statusFilter = params.status || "ALL";
  const operatorFilter = params.operator || "ALL";

  const withdrawals = await prisma.withdrawal.findMany({
    include: {
      wallet: {
        include: {
          profile: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalWithdrawals = withdrawals.length;

  const pendingWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PENDING"
  );

  const processingWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PROCESSING"
  );

  const paidWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PAID"
  );

  const rejectedWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal.status === "REJECTED"
  );

  const totalRequestedAmount = withdrawals
    .filter((withdrawal) => withdrawal.status !== "REJECTED")
    .reduce((total, withdrawal) => total + withdrawal.amount, 0);

  const totalPaidAmount = paidWithdrawals.reduce(
    (total, withdrawal) => total + withdrawal.amount,
    0
  );

  const totalPendingAmount = [
    ...pendingWithdrawals,
    ...processingWithdrawals,
  ].reduce((total, withdrawal) => total + withdrawal.amount, 0);

  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    const profile = withdrawal.wallet.profile;
    const professional = profile.user;

    const fullName = `${withdrawal.firstName} ${withdrawal.lastName}`;

    const matchesSearch =
      !query ||
      withdrawal.reference.toLowerCase().includes(query) ||
      withdrawal.phone.toLowerCase().includes(query) ||
      withdrawal.firstName.toLowerCase().includes(query) ||
      withdrawal.lastName.toLowerCase().includes(query) ||
      fullName.toLowerCase().includes(query) ||
      profile.businessName.toLowerCase().includes(query) ||
      professional.name.toLowerCase().includes(query) ||
      professional.email.toLowerCase().includes(query) ||
      professional.phone.includes(query);

    const matchesStatus =
      statusFilter === "ALL" ||
      withdrawal.status === statusFilter;

    const matchesOperator =
      operatorFilter === "ALL" ||
      withdrawal.operator.toLowerCase() ===
        operatorFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesOperator;
  });

  const displayedWithdrawals = filteredWithdrawals.slice(0, 100);

  const operators = Array.from(
    new Set(withdrawals.map((withdrawal) => withdrawal.operator))
  ).sort();

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <span>Administration</span>
            <span>/</span>
            <span className="text-slate-600">Retraits</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#061b31]">
            Retraits
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Suivez et contrôlez les demandes de retrait des professionnels.
          </p>
        </div>

        <Link
          href="/admin/retraits"
          className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#e5edf5] bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw size={15} />
          Réinitialiser
        </Link>
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total des demandes
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-50 text-[#533afd]">
              <Wallet size={18} />
            </div>
          </div>

          <p className="mt-4 text-2xl font-semibold text-[#061b31]">
            {totalWithdrawals}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Toutes les demandes enregistrées
          </p>
        </div>

        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              En attente
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-amber-50 text-amber-600">
              <Clock size={18} />
            </div>
          </div>

          <p className="mt-4 text-2xl font-semibold text-amber-700">
            {pendingWithdrawals.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatMoney(
              pendingWithdrawals.reduce(
                (total, withdrawal) => total + withdrawal.amount,
                0
              )
            )}
          </p>
        </div>

        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              En traitement
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-50 text-blue-600">
              <RefreshCw size={18} />
            </div>
          </div>

          <p className="mt-4 text-2xl font-semibold text-blue-700">
            {processingWithdrawals.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatMoney(
              processingWithdrawals.reduce(
                (total, withdrawal) => total + withdrawal.amount,
                0
              )
            )}
          </p>
        </div>

        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total payé
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <p className="mt-4 text-xl font-semibold text-emerald-700">
            {formatMoney(totalPaidAmount)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {paidWithdrawals.length} retrait(s) payé(s)
          </p>
        </div>
      </div>

      {/* INFORMATIONS FINANCIÈRES */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded border border-[#e5edf5] bg-white p-5">
          <div>
            <p className="text-sm text-slate-500">
              Montant des demandes non rejetées
            </p>

            <p className="mt-2 text-xl font-semibold text-[#061b31]">
              {formatMoney(totalRequestedAmount)}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded bg-indigo-50 text-[#533afd]">
            <Banknote size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded border border-[#e5edf5] bg-white p-5">
          <div>
            <p className="text-sm text-slate-500">
              Montant restant à traiter
            </p>

            <p className="mt-2 text-xl font-semibold text-amber-700">
              {formatMoney(totalPendingAmount)}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded bg-amber-50 text-amber-600">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="rounded border border-[#e5edf5] bg-white p-4">
        <form
          action="/admin/retraits"
          method="GET"
          className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto]"
        >
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              name="q"
              defaultValue={params.q || ""}
              placeholder="Référence, professionnel, téléphone..."
              className="h-10 w-full rounded border border-[#e5edf5] bg-white pl-10 pr-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd]"
            />
          </div>

          <select
            name="status"
            defaultValue={statusFilter}
            className="h-10 rounded border border-[#e5edf5] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#533afd]"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="PROCESSING">En traitement</option>
            <option value="PAID">Payés</option>
            <option value="REJECTED">Rejetés</option>
          </select>

          <select
            name="operator"
            defaultValue={operatorFilter}
            className="h-10 rounded border border-[#e5edf5] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#533afd]"
          >
            <option value="ALL">Tous les opérateurs</option>

            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#533afd] px-5 text-sm font-medium text-white transition hover:bg-[#4329df]"
          >
            <Search size={15} />
            Rechercher
          </button>
        </form>
      </div>

      {/* LISTE DES RETRAITS */}
      <div className="overflow-hidden rounded border border-[#e5edf5] bg-white">
        <div className="flex flex-col gap-2 border-b border-[#e5edf5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#061b31]">
              Demandes de retrait
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {filteredWithdrawals.length} résultat(s)
              {filteredWithdrawals.length > 100
                ? " — affichage des 100 premiers"
                : ""}
            </p>
          </div>
        </div>

        {displayedWithdrawals.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Wallet size={22} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#061b31]">
              Aucune demande trouvée
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Aucune demande de retrait ne correspond à tes critères.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left">
                <thead className="bg-[#f8fafd]">
                  <tr className="border-b border-[#e5edf5] text-xs font-medium text-slate-500">
                    <th className="px-5 py-3">Professionnel</th>
                    <th className="px-5 py-3">Référence</th>
                    <th className="px-5 py-3">Montant</th>
                    <th className="px-5 py-3">Destination</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Statut</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e5edf5]">
                  {displayedWithdrawals.map((withdrawal) => {
                    const profile = withdrawal.wallet.profile;

                    return (
                      <tr
                        key={withdrawal.id}
                        className="transition hover:bg-[#f8fafd]"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-[#061b31]">
                            {profile.businessName}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {profile.user.name}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {profile.user.email}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-medium text-[#061b31]">
                            {withdrawal.reference}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {withdrawal.firstName} {withdrawal.lastName}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-[#061b31]">
                          {formatMoney(withdrawal.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <Phone size={13} className="text-slate-400" />
                            {withdrawal.phone}
                          </div>

                          <div className="mt-1">
                            <OperatorBadge operator={withdrawal.operator} />
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <CalendarDays
                              size={14}
                              className="text-slate-400"
                            />
                            {formatDate(withdrawal.createdAt)}
                          </div>

                          {withdrawal.processedAt && (
                            <div className="mt-1 text-xs text-slate-400">
                              Traité le {formatDate(withdrawal.processedAt)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <StatusBadge status={withdrawal.status} />

                            {withdrawal.adminNote && (
                              <p className="max-w-[200px] text-xs text-slate-400">
                                Note : {withdrawal.adminNote}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-[#e5edf5] lg:hidden">
              {displayedWithdrawals.map((withdrawal) => {
                const profile = withdrawal.wallet.profile;

                return (
                  <div key={withdrawal.id} className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#061b31]">
                          {profile.businessName}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {profile.user.name}
                        </p>

                        <p className="mt-1 break-all font-mono text-xs text-slate-400">
                          {withdrawal.reference}
                        </p>
                      </div>

                      <StatusBadge status={withdrawal.status} />
                    </div>

                    <div className="rounded bg-[#f8fafd] p-3">
                      <p className="text-xs text-slate-400">
                        Montant du retrait
                      </p>

                      <p className="mt-1 text-xl font-semibold text-[#061b31]">
                        {formatMoney(withdrawal.amount)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-400">
                          Bénéficiaire
                        </span>

                        <span className="text-right font-medium text-slate-700">
                          {withdrawal.firstName} {withdrawal.lastName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-400">
                          Téléphone
                        </span>

                        <span className="font-medium text-slate-700">
                          {withdrawal.phone}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-400">
                          Opérateur
                        </span>

                        <OperatorBadge operator={withdrawal.operator} />
                      </div>

                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-400">
                          Demande
                        </span>

                        <span className="text-right text-slate-600">
                          {formatDate(withdrawal.createdAt)}
                        </span>
                      </div>

                      {withdrawal.processedAt && (
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-400">
                            Traitement
                          </span>

                          <span className="text-right text-slate-600">
                            {formatDate(withdrawal.processedAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    {withdrawal.adminNote && (
                      <div className="rounded border border-[#e5edf5] p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Note administrative
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {withdrawal.adminNote}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="rounded border border-[#e5edf5] bg-[#f8fafd] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-[#533afd]">
            <Receipt size={18} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#061b31]">
              Traitement manuel des retraits
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Les paiements aux professionnels sont effectués manuellement
              par l'administrateur via Mobile Money. Cette page permet
              actuellement de consulter et de suivre les demandes.
              Le changement de statut et l'enregistrement du traitement
              seront ajoutés avec les actions sécurisées correspondantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}