import Link from "next/link";
import { connection } from "next/server";

import {
  Search,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  Building2,
  Mail,
  Phone,
  ArrowUpRight,
  Crown,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  plan?: string;
}>;

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

function getStatus(subscription: {
  status: string;
  expiresAt: Date;
}, now: Date) {
  if (subscription.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (
    subscription.status === "EXPIRED" ||
    (subscription.status === "ACTIVE" && subscription.expiresAt <= now)
  ) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    EXPIRED: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    ACTIVE: "Actif",
    EXPIRED: "Expiré",
    CANCELLED: "Annulé",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      {status === "ACTIVE" && <CheckCircle2 size={13} />}
      {status === "EXPIRED" && <Clock size={13} />}
      {status === "CANCELLED" && <XCircle size={13} />}

      {labels[status] || status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${
        plan === "PREMIUM"
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {plan === "PREMIUM" && <Crown size={13} />}
      {plan === "PREMIUM" ? "Premium" : "Basic"}
    </span>
  );
}

export default async function AdminAbonnementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();

  const now = new Date();

  const params = await searchParams;

  const query = (params.q || "").trim().toLowerCase();
  const statusFilter = params.status || "ALL";
  const planFilter = params.plan || "ALL";

  const subscriptions = await prisma.subscription.findMany({
    include: {
      profile: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          city: true,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  const subscriptionsWithStatus = subscriptions.map((subscription) => ({
    ...subscription,
    currentStatus: getStatus(subscription, now),
  }));

  const totalSubscriptions = subscriptions.length;

  const activeSubscriptions = subscriptionsWithStatus.filter(
    (subscription) => subscription.currentStatus === "ACTIVE"
  ).length;

  const expiredSubscriptions = subscriptionsWithStatus.filter(
    (subscription) => subscription.currentStatus === "EXPIRED"
  ).length;

  const cancelledSubscriptions = subscriptionsWithStatus.filter(
    (subscription) => subscription.currentStatus === "CANCELLED"
  ).length;

  const filteredSubscriptions = subscriptionsWithStatus.filter(
    (subscription) => {
      const matchesSearch =
        !query ||
        subscription.profile.businessName.toLowerCase().includes(query) ||
        subscription.profile.user.name.toLowerCase().includes(query) ||
        subscription.profile.user.email.toLowerCase().includes(query) ||
        subscription.profile.user.phone.includes(query) ||
        subscription.profile.city.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        subscription.currentStatus === statusFilter;

      const matchesPlan =
        planFilter === "ALL" ||
        subscription.plan === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    }
  );

  const displayedSubscriptions = filteredSubscriptions.slice(0, 100);

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <span>Administration</span>
            <span>/</span>
            <span className="text-slate-600">Abonnements</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#061b31]">
            Abonnements
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Suivez les abonnements et les formules des professionnels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/abonnements"
            className="inline-flex h-10 items-center gap-2 rounded border border-[#e5edf5] bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            Réinitialiser
          </Link>
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total des abonnements
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-50 text-[#533afd]">
              <CreditCard size={18} />
            </div>
          </div>

          <p className="mt-4 text-2xl font-semibold text-[#061b31]">
            {totalSubscriptions}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Tous les abonnements enregistrés
          </p>
        </div>

        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Abonnements actifs
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <p className="mt-4 text-2xl font-semibold text-emerald-700">
            {activeSubscriptions}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Abonnements actuellement valides
          </p>
        </div>

        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Abonnements expirés
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-amber-50 text-amber-600">
              <Clock size={18} />
            </div>
          </div>

          <p className="mt-4 text-2xl font-semibold text-amber-700">
            {expiredSubscriptions}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Périodes de validité terminées
          </p>
        </div>

        <div className="rounded border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Abonnements annulés
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded bg-red-50 text-red-600">
              <XCircle size={18} />
            </div>
          </div>

          <p className="mt-4 text-2xl font-semibold text-red-700">
            {cancelledSubscriptions}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Abonnements interrompus
          </p>
        </div>
      </div>

      {/* FILTRES */}
      <div className="rounded border border-[#e5edf5] bg-white p-4">
        <form
          action="/admin/abonnements"
          method="GET"
          className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_190px_190px_auto]"
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
              placeholder="Rechercher un professionnel..."
              className="h-10 w-full rounded border border-[#e5edf5] bg-white pl-10 pr-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd]"
            />
          </div>

          <select
            name="status"
            defaultValue={statusFilter}
            className="h-10 rounded border border-[#e5edf5] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#533afd]"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actifs</option>
            <option value="EXPIRED">Expirés</option>
            <option value="CANCELLED">Annulés</option>
          </select>

          <select
            name="plan"
            defaultValue={planFilter}
            className="h-10 rounded border border-[#e5edf5] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#533afd]"
          >
            <option value="ALL">Toutes les formules</option>
            <option value="BASIC">Basic</option>
            <option value="PREMIUM">Premium</option>
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

      {/* TABLEAU */}
      <div className="overflow-hidden rounded border border-[#e5edf5] bg-white">
        <div className="flex flex-col gap-2 border-b border-[#e5edf5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#061b31]">
              Liste des abonnements
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {filteredSubscriptions.length} résultat(s)
              {filteredSubscriptions.length > 100
                ? " — affichage des 100 premiers"
                : ""}
            </p>
          </div>
        </div>

        {displayedSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <CreditCard size={22} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#061b31]">
              Aucun abonnement trouvé
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Aucun abonnement ne correspond aux critères de recherche.
            </p>
          </div>
        ) : (
          <>
            {/* VERSION DESKTOP */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left">
                <thead className="bg-[#f8fafd]">
                  <tr className="border-b border-[#e5edf5] text-xs font-medium text-slate-500">
                    <th className="px-5 py-3">Professionnel</th>
                    <th className="px-5 py-3">Formule</th>
                    <th className="px-5 py-3">Montant</th>
                    <th className="px-5 py-3">Période</th>
                    <th className="px-5 py-3">Expiration</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Profil</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e5edf5]">
                  {displayedSubscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className="transition hover:bg-[#f8fafd]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-[#061b31]">
                          {subscription.profile.businessName}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {subscription.profile.user.name}
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail size={12} />
                          {subscription.profile.user.email}
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Building2 size={12} />
                          {subscription.profile.city}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <PlanBadge plan={subscription.plan} />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-[#061b31]">
                        {formatMoney(subscription.amount)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <CalendarDays size={14} className="text-slate-400" />
                          {formatDate(subscription.startsAt)}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          Début de validité
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="text-sm text-slate-700">
                          {formatDate(subscription.expiresAt)}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          Fin de validité
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={subscription.currentStatus} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/p/${subscription.profile.slug}`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1.5 rounded border border-[#e5edf5] px-2.5 text-xs font-medium text-slate-600 transition hover:border-[#b9b9f9] hover:text-[#533afd]"
                        >
                          Voir
                          <ArrowUpRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VERSION MOBILE */}
            <div className="divide-y divide-[#e5edf5] lg:hidden">
              {displayedSubscriptions.map((subscription) => (
                <div key={subscription.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#061b31]">
                        {subscription.profile.businessName}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {subscription.profile.user.name}
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-400">
                        {subscription.profile.user.email}
                      </p>
                    </div>

                    <StatusBadge status={subscription.currentStatus} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <PlanBadge plan={subscription.plan} />

                    <span className="text-sm font-semibold text-[#061b31]">
                      {formatMoney(subscription.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded bg-[#f8fafd] p-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        Début
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {formatDate(subscription.startsAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Expiration
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {formatDate(subscription.expiresAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Phone size={13} />
                      {subscription.profile.user.phone}
                    </span>

                    <Link
                      href={`/p/${subscription.profile.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#533afd]"
                    >
                      Voir le profil
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Les statuts affichés tiennent compte de la date d'expiration réelle.
        Un abonnement dont la date d'expiration est dépassée est affiché comme
        expiré, même si son statut enregistré en base n'a pas encore été mis à jour.
      </p>
    </div>
  );
}