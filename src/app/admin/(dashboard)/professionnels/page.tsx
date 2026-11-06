import Link from "next/link";
import {
  Search,
  Building2,
  Users,
  BadgeCheck,
  Eye,
  EyeOff,
  MapPin,
  CalendarDays,
  BriefcaseBusiness,
  ArrowUpRight,
  Mail,
  Phone,
  Store,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

const CATEGORIES = [
  { value: "HOTEL", label: "Hôtels" },
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "EVENT", label: "Événementiel" },
  { value: "VENUE", label: "Salles et espaces" },
  { value: "PHOTOGRAPHY", label: "Photographie" },
  { value: "BEAUTY", label: "Beauté" },
  { value: "VEHICLE", label: "Véhicules" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MECHANIC", label: "Mécanique" },
  { value: "TECHNICIAN", label: "Techniciens" },
  { value: "ARTISAN", label: "Artisans" },
  { value: "OTHER", label: "Autres" },
] as const;

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ProfessionnelsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const search = params.q?.trim() ?? "";

  const selectedCategory = CATEGORIES.some(
    (item) => item.value === params.category
  )
    ? params.category
    : "";

  const selectedStatus = ["published", "unpublished"].includes(
    params.status ?? ""
  )
    ? params.status
    : "";

  const where = {
    ...(selectedCategory
      ? {
          category: selectedCategory as (typeof CATEGORIES)[number]["value"],
        }
      : {}),

    ...(selectedStatus === "published"
      ? { isPublished: true }
      : selectedStatus === "unpublished"
        ? { isPublished: false }
        : {}),

    ...(search
      ? {
          OR: [
            {
              businessName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              city: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              slug: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              user: {
                is: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              user: {
                is: {
                  email: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              user: {
                is: {
                  phone: {
                    contains: search,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [
    totalProfessionals,
    publishedProfessionals,
    unpublishedProfessionals,
    certifiedProfessionals,
    professionals,
  ] = await Promise.all([
    prisma.professionalProfile.count(),

    prisma.professionalProfile.count({
      where: { isPublished: true },
    }),

    prisma.professionalProfile.count({
      where: { isPublished: false },
    }),

    prisma.professionalProfile.count({
      where: {
        blueBadgeAt: { not: null },
      },
    }),

    prisma.professionalProfile.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        businessName: true,
        slug: true,
        category: true,
        city: true,
        country: true,
        isPublished: true,
        blueBadgeAt: true,
        createdAt: true,

        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },

        _count: {
          select: {
            services: true,
            bookings: true,
          },
        },
      },
    }),
  ]);

  const categoryLabels = Object.fromEntries(
    CATEGORIES.map((item) => [item.value, item.label])
  );

  return (
    <div className="space-y-8">

      {/* EN-TÊTE */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#533afd]">
            Administration
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[#061b31] sm:text-3xl">
            Professionnels
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consultez et suivez les professionnels inscrits sur Reserve X.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          {totalProfessionals} professionnels inscrits
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Total professionnels"
          value={totalProfessionals}
          icon={Building2}
          color="navy"
        />

        <StatCard
          label="Profils publiés"
          value={publishedProfessionals}
          icon={Eye}
          color="green"
        />

        <StatCard
          label="Profils non publiés"
          value={unpublishedProfessionals}
          icon={EyeOff}
          color="orange"
        />

        <StatCard
          label="Badge bleu"
          value={certifiedProfessionals}
          icon={BadgeCheck}
          color="purple"
        />

      </div>

      {/* RECHERCHE ET FILTRES */}
      <section className="border border-[#e5edf5] bg-white">

        <div className="border-b border-[#e5edf5] p-5">
          <h2 className="font-bold text-[#061b31]">
            Liste des professionnels
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Recherche et filtrage des établissements.
          </p>
        </div>

        <form
          action="/admin/professionnels"
          method="GET"
          className="flex flex-col gap-3 border-b border-[#e5edf5] p-5 lg:flex-row"
        >

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Nom, établissement, e-mail, téléphone..."
              className="h-11 w-full border border-[#e5edf5] bg-[#f8fafd] pl-10 pr-4 text-sm outline-none transition focus:border-[#533afd]"
            />
          </div>

          <select
            name="category"
            defaultValue={selectedCategory}
            className="h-11 border border-[#e5edf5] bg-white px-3 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
          >
            <option value="">Toutes les catégories</option>

            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-11 border border-[#e5edf5] bg-white px-3 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
          >
            <option value="">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="unpublished">Non publiés</option>
          </select>

          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 bg-[#533afd] px-5 text-sm font-semibold text-white transition hover:bg-[#432bdc]"
          >
            <Search className="h-4 w-4" />
            Rechercher
          </button>

        </form>

        {/* TABLEAU */}
        <div className="overflow-x-auto">

          <table className="w-full min-w-[950px] text-left">

            <thead>
              <tr className="border-b border-[#e5edf5] bg-[#f8fafd] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-4">Établissement</th>
                <th className="px-5 py-4">Professionnel</th>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4">Activité</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4">Inscription</th>
                <th className="px-5 py-4">Profil</th>
              </tr>
            </thead>

            <tbody>

              {professionals.map((professional) => (
                <tr
                  key={professional.id}
                  className="border-b border-[#e5edf5] last:border-0 hover:bg-[#f8fafd]"
                >

                  {/* ÉTABLISSEMENT */}
                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#533afd]/10">
                        <Store className="h-5 w-5 text-[#533afd]" />
                      </div>

                      <div>
                        <p className="font-semibold text-[#061b31]">
                          {professional.businessName}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {professional.city}, {professional.country}
                        </p>

                        {professional.blueBadgeAt && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Badge bleu
                          </span>
                        )}

                      </div>

                    </div>

                  </td>

                  {/* PROFESSIONNEL */}
                  <td className="px-5 py-5">

                    <p className="text-sm font-semibold text-[#061b31]">
                      {professional.user.name}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Mail className="h-3 w-3" />
                      {professional.user.email}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Phone className="h-3 w-3" />
                      {professional.user.phone}
                    </p>

                  </td>

                  {/* CATÉGORIE */}
                  <td className="px-5 py-5">
                    <span className="inline-flex border border-[#e5edf5] bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                      {categoryLabels[professional.category] ?? professional.category}
                    </span>
                  </td>

                  {/* ACTIVITÉ */}
                  <td className="px-5 py-5">

                    <div className="space-y-2 text-xs text-slate-500">

                      <p className="flex items-center gap-2">
                        <BriefcaseBusiness className="h-3.5 w-3.5" />
                        {professional._count.services} prestation(s)
                      </p>

                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {professional._count.bookings} réservation(s)
                      </p>

                    </div>

                  </td>

                  {/* STATUT */}
                  <td className="px-5 py-5">

                    {professional.isPublished ? (
                      <span className="inline-flex items-center gap-1.5 border border-green-100 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Publié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 border border-orange-100 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        Non publié
                      </span>
                    )}

                  </td>

                  {/* INSCRIPTION */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-slate-600">
                      {formatDate(professional.createdAt)}
                    </p>
                  </td>

                  {/* PROFIL PUBLIC */}
                  <td className="px-5 py-5">

                    {professional.isPublished ? (
                      <Link
                        href={`/p/${professional.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#533afd] hover:underline"
                      >
                        Voir
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-300">
                        Indisponible
                      </span>
                    )}

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

          {/* AUCUN RÉSULTAT */}
          {professionals.length === 0 && (
            <div className="px-5 py-16 text-center">

              <Building2 className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-semibold text-[#061b31]">
                Aucun professionnel trouvé
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Modifiez votre recherche ou vos filtres.
              </p>

              <Link
                href="/admin/professionnels"
                className="mt-5 inline-flex text-sm font-semibold text-[#533afd] hover:underline"
              >
                Réinitialiser les filtres
              </Link>

            </div>
          )}

        </div>

        {/* INFORMATIONS */}
        <div className="border-t border-[#e5edf5] px-5 py-4 text-xs text-slate-400">
          Affichage des {professionals.length} derniers professionnels
          {professionals.length === 50 ? " (maximum 50)" : ""}.
        </div>

      </section>

    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "navy" | "green" | "orange" | "purple";
}) {
  const colors = {
    navy: "bg-[#061b31]/5 text-[#061b31]",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-[#533afd]/10 text-[#533afd]",
  };

  return (
    <div className="border border-[#e5edf5] bg-white p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <span className={`flex h-10 w-10 items-center justify-center ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </span>

      </div>

      <p className="mt-5 text-3xl font-bold tracking-tight text-[#061b31]">
        {value.toLocaleString("fr-FR")}
      </p>

    </div>
  );
}