import { connection } from "next/server";
import Link from "next/link";

import {
  Users,
  Search,
  UserRound,
  CalendarDays,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  ArrowUpRight,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

type ClientsPageProps = {
  searchParams: Promise<{
    q?: string;
    activity?: string;
  }>;
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "Aucune réservation";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

export default async function ClientsPage({
  searchParams,
}: ClientsPageProps) {
  // Force le rendu à la demande avant d'utiliser la date actuelle.
  await connection();

  const params = await searchParams;

  const search = params.q?.trim() ?? "";
  const activity = params.activity ?? "all";

  // Calcul des dates après connection().
  const now = new Date();

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  // Filtres de recherche.
  const where = {
    role: "CUSTOMER" as const,

    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(activity === "active"
      ? {
          customerBookings: {
            some: {},
          },
        }
      : activity === "inactive"
        ? {
            customerBookings: {
              none: {},
            },
          }
        : {}),
  };

  // Statistiques générales.
  const [
    totalClients,
    clientsWithBookings,
    clientsWithoutBookings,
    newClientsThisMonth,
    clients,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),

    prisma.user.count({
      where: {
        role: "CUSTOMER",
        customerBookings: {
          some: {},
        },
      },
    }),

    prisma.user.count({
      where: {
        role: "CUSTOMER",
        customerBookings: {
          none: {},
        },
      },
    }),

    prisma.user.count({
      where: {
        role: "CUSTOMER",
        createdAt: {
          gte: monthStart,
        },
      },
    }),

    prisma.user.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      take: 50,

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,

        _count: {
          select: {
            customerBookings: true,
          },
        },

        customerBookings: {
          orderBy: {
            createdAt: "desc",
          },

          take: 1,

          select: {
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

          <span className="text-[#061b31]">Clients</span>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#061b31]">
              Clients
            </h1>

            <p className="mt-2 text-sm text-[#64748b]">
              Consultez les comptes clients et leur activité sur Reserve X.
            </p>
          </div>

          <div className="text-sm text-[#64748b]">
            {clients.length} résultat(s) affiché(s) sur un maximum de 50
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total des clients"
          value={totalClients}
          description="Tous les comptes clients"
          icon={Users}
        />

        <StatCard
          title="Clients actifs"
          value={clientsWithBookings}
          description="Au moins une réservation"
          icon={UserCheck}
        />

        <StatCard
          title="Sans réservation"
          value={clientsWithoutBookings}
          description="Aucune réservation enregistrée"
          icon={UserRound}
        />

        <StatCard
          title="Nouveaux ce mois"
          value={newClientsThisMonth}
          description="Inscriptions depuis le début du mois"
          icon={UserPlus}
        />
      </div>

      {/* Recherche et filtres */}
      <div className="rounded-xl border border-[#e5edf5] bg-white p-5">
        <form
          action="/admin/clients"
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
              placeholder="Rechercher par nom, e-mail ou téléphone..."
              className="h-11 w-full rounded-lg border border-[#e5edf5] bg-white pl-10 pr-4 text-sm text-[#061b31] outline-none transition placeholder:text-[#94a3b8] focus:border-[#533afd]"
            />
          </div>

          <select
            name="activity"
            defaultValue={activity}
            className="h-11 rounded-lg border border-[#e5edf5] bg-white px-4 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
          >
            <option value="all">Tous les clients</option>
            <option value="active">Avec réservation</option>
            <option value="inactive">Sans réservation</option>
          </select>

          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#533afd] px-5 text-sm font-medium text-white transition hover:bg-[#4230d4]"
          >
            <Search size={16} />
            Rechercher
          </button>

          {(search || activity !== "all") && (
            <Link
              href="/admin/clients"
              className="flex h-11 items-center justify-center rounded-lg border border-[#e5edf5] px-5 text-sm text-[#64748b] transition hover:bg-[#f8fafd]"
            >
              Réinitialiser
            </Link>
          )}
        </form>
      </div>

      {/* Tableau des clients */}
      <div className="overflow-hidden rounded-xl border border-[#e5edf5] bg-white">
        <div className="flex flex-col justify-between gap-2 border-b border-[#e5edf5] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-[#061b31]">
              Liste des clients
            </h2>

            <p className="mt-1 text-xs text-[#94a3b8]">
              Les 50 inscriptions les plus récentes correspondent au maximum
              affiché.
            </p>
          </div>

          <span className="text-sm text-[#64748b]">
            {clients.length} client(s)
          </span>
        </div>

        {clients.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f8fafd] text-[#94a3b8]">
              <Users size={24} />
            </div>

            <h3 className="mt-4 font-medium text-[#061b31]">
              Aucun client trouvé
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
                    <th className="px-5 py-4 font-medium">Client</th>
                    <th className="px-5 py-4 font-medium">Coordonnées</th>
                    <th className="px-5 py-4 font-medium">
                      Réservations
                    </th>
                    <th className="px-5 py-4 font-medium">
                      Dernière activité
                    </th>
                    <th className="px-5 py-4 font-medium">
                      Inscription
                    </th>
                    <th className="px-5 py-4 font-medium">Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {clients.map((client) => {
                    const hasBookings =
                      client._count.customerBookings > 0;

                    const lastBooking =
                      client.customerBookings[0]?.createdAt ?? null;

                    const isNew =
                      client.createdAt >= monthStart;

                    return (
                      <tr
                        key={client.id}
                        className="border-b border-[#e5edf5] last:border-0 transition hover:bg-[#fbfcfe]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f3ff] text-sm font-semibold text-[#533afd]">
                              {(client.name?.trim()?.[0] || "?").toUpperCase()}
                            </div>

                            <div>
                              <p className="font-medium text-[#061b31]">
                                {client.name || "Client sans nom"}
                              </p>

                              <p className="mt-1 text-xs text-[#94a3b8]">
                                ID : {client.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-[#475569]">
                              <Mail
                                size={14}
                                className="shrink-0 text-[#94a3b8]"
                              />

                              <span>{client.email}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                              <Phone
                                size={13}
                                className="shrink-0"
                              />

                              <span>
                                {client.phone || "Non renseigné"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-[#061b31]">
                            {client._count.customerBookings}
                          </span>

                          <span className="ml-1 text-xs text-[#94a3b8]">
                            réservation(s)
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#64748b]">
                          {formatDate(lastBooking)}
                        </td>

                        <td className="px-5 py-4 text-sm text-[#64748b]">
                          {formatDate(client.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          {hasBookings ? (
                            <span className="inline-flex items-center rounded-full bg-[#ecfdf5] px-2.5 py-1 text-xs font-medium text-[#047857]">
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-medium text-[#64748b]">
                              Inactif
                            </span>
                          )}

                          {isNew && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-medium text-[#533afd]">
                              Nouveau
                            </span>
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
              {clients.map((client) => {
                const hasBookings =
                  client._count.customerBookings > 0;

                const lastBooking =
                  client.customerBookings[0]?.createdAt ?? null;

                const isNew =
                  client.createdAt >= monthStart;

                return (
                  <div key={client.id} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f3ff] text-sm font-semibold text-[#533afd]">
                          {(client.name?.trim()?.[0] || "?").toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#061b31]">
                            {client.name || "Client sans nom"}
                          </p>

                          <p className="mt-1 truncate text-xs text-[#94a3b8]">
                            {client.email}
                          </p>
                        </div>
                      </div>

                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-[#94a3b8]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-[#94a3b8]">
                          Téléphone
                        </p>

                        <p className="mt-1 text-[#475569]">
                          {client.phone || "Non renseigné"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#94a3b8]">
                          Réservations
                        </p>

                        <p className="mt-1 font-medium text-[#061b31]">
                          {client._count.customerBookings}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#94a3b8]">
                          Dernière activité
                        </p>

                        <p className="mt-1 text-[#475569]">
                          {formatDate(lastBooking)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#94a3b8]">
                          Inscription
                        </p>

                        <p className="mt-1 text-[#475569]">
                          {formatDate(client.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {hasBookings ? (
                        <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-xs font-medium text-[#047857]">
                          Actif
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-medium text-[#64748b]">
                          Inactif
                        </span>
                      )}

                      {isNew && (
                        <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-medium text-[#533afd]">
                          Nouveau
                        </span>
                      )}
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
        <CalendarDays
          size={18}
          className="mt-0.5 shrink-0 text-[#533afd]"
        />

        <div>
          <p className="text-sm font-medium text-[#061b31]">
            Informations sur les clients
          </p>

          <p className="mt-1 text-xs leading-5 text-[#64748b]">
            Un client est considéré comme actif dès qu'il possède au moins
            une réservation enregistrée. Cette page est consultative :
            aucune modification ou suppression de compte n'est effectuée ici.
          </p>
        </div>
      </div>
    </div>
  );
}