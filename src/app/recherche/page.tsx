import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowUpRight,
  Search,
  MapPin,
  Clock3,
  BriefcaseBusiness,
  SlidersHorizontal,
  CalendarDays,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

const categories = [
  { value: "HOTEL", label: "Hôtels & hébergements" },
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "EVENT", label: "Événements" },
  { value: "VENUE", label: "Location de salles" },
  { value: "PHOTOGRAPHY", label: "Photographie" },
  { value: "BEAUTY", label: "Beauté & bien-être" },
  { value: "VEHICLE", label: "Location de véhicules" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MECHANIC", label: "Mécanique" },
  { value: "TECHNICIAN", label: "Techniciens" },
  { value: "ARTISAN", label: "Artisans" },
  { value: "OTHER", label: "Autres services" },
];

function formatPrice(price: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(price)} ${currency}`;
}

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    category?: string;
  }>;
};

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  await connection();

  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const category = params.category?.trim() ?? "";

  const validCategory = categories.some(
    (item) => item.value === category,
  )
    ? category
    : "";

  const prestations = await prisma.service.findMany({
    where: {
      isActive: true,
      profile: {
        isPublished: true,
        ...(city
          ? {
              city: {
                contains: city,
                mode: "insensitive",
              },
            }
          : {}),
        ...(validCategory ? { category: validCategory as never } : {}),
      },
      ...(q
        ? {
            OR: [
              {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                profile: {
                  businessName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      durationMinutes: true,
      profile: {
        select: {
          businessName: true,
          slug: true,
          city: true,
          category: true,
          blueBadgeAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#061b31]">

      {/* NAVIGATION */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">

          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#061b31]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white shadow-lg shadow-[#533afd]/20">
              <CalendarDays size={20} />
            </span>

            Reserve<span className="text-[#533afd]">X</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-[#533afd]/5 hover:text-[#533afd]"
          >
            <ArrowRight size={16} className="rotate-180" />
            <span className="hidden sm:inline">Retour à l'accueil</span>
            <span className="sm:hidden">Accueil</span>
          </Link>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}

      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-14">

        {/* INTRODUCTION */}

        <section className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#533afd]/10 bg-[#533afd]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#533afd]">
            <Search size={15} />
            Explorer Reserve X
          </div>

          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-[#061b31] sm:text-4xl md:text-5xl">
            Trouvez votre prochaine expérience.
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Découvrez les prestations disponibles et réservez directement
            auprès des professionnels.
          </p>
        </section>

        {/* RECHERCHE ET FILTRES */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#061b31]">
              Trouvez le service qui vous correspond
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Utilisez les filtres pour affiner votre recherche.
            </p>
          </div>

          <form
            action="/recherche"
            className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]"
          >
            {/* RECHERCHE PAR SERVICE */}

            <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#533afd] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#533afd]/10">
              <Search size={18} className="shrink-0 text-[#533afd]" />

              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Service ou professionnel..."
                className="w-full bg-transparent text-sm text-[#061b31] outline-none placeholder:text-slate-400"
              />
            </label>

            {/* RECHERCHE PAR VILLE */}

            <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#533afd] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#533afd]/10">
              <MapPin size={18} className="shrink-0 text-[#533afd]" />

              <input
                type="text"
                name="city"
                defaultValue={city}
                placeholder="Ville"
                className="w-full bg-transparent text-sm text-[#061b31] outline-none placeholder:text-slate-400"
              />
            </label>

            {/* CATÉGORIE */}

            <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#533afd] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#533afd]/10">
              <SlidersHorizontal
                size={18}
                className="shrink-0 text-[#533afd]"
              />

              <select
                name="category"
                defaultValue={validCategory}
                className="w-full bg-transparent text-sm text-[#061b31] outline-none"
              >
                <option value="">Toutes les catégories</option>

                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {/* BOUTON */}

            <button
              type="submit"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#533afd] px-7 text-sm font-bold text-white shadow-md shadow-[#533afd]/20 transition hover:bg-[#4229e8]"
            >
              Rechercher
              <Search size={16} />
            </button>
          </form>
        </section>

        {/* RÉSULTATS */}

        <section className="mt-12">

          {/* EN-TÊTE */}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#061b31] sm:text-2xl">
                Prestations disponibles
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                <span className="font-bold text-[#533afd]">
                  {prestations.length}
                </span>{" "}
                résultat
                {prestations.length > 1 ? "s" : ""} trouvé
                {prestations.length > 1 ? "s" : ""}
              </p>
            </div>

            {(q || city || validCategory) && (
              <Link
                href="/recherche"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:border-[#533afd]/30 hover:bg-[#533afd]/5 hover:text-[#533afd]"
              >
                Effacer les filtres
              </Link>
            )}
          </div>

          {/* CARTES DES PRESTATIONS */}

          {prestations.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {prestations.map((prestation) => (
                <article
                  key={prestation.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#533afd]/30 hover:shadow-xl hover:shadow-slate-200/50"
                >
                  <div className="flex flex-1 flex-col p-6">

                    {/* CATÉGORIE ET BADGE */}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full border border-[#533afd]/10 bg-[#533afd]/10 px-3 py-1.5 text-[11px] font-bold text-[#533afd]">
                        {categories.find(
                          (item) => item.value === prestation.profile.category,
                        )?.label ?? "Autres services"}
                      </span>

                      {prestation.profile.blueBadgeAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#533afd]">
                          <BadgeCheck size={15} />
                          Vérifié
                        </span>
                      )}
                    </div>

                    {/* NOM DU SERVICE */}

                    <h3 className="mt-6 text-xl font-bold tracking-tight text-[#061b31]">
                      {prestation.name}
                    </h3>

                    {/* PROFESSIONNEL */}

                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {prestation.profile.businessName}
                    </p>

                    {/* DESCRIPTION */}

                    {prestation.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
                        {prestation.description}
                      </p>
                    )}

                    {/* LOCALISATION ET DURÉE */}

                    <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={15} className="text-[#533afd]" />
                        {prestation.profile.city}
                      </span>

                      {prestation.durationMinutes && (
                        <span className="flex items-center gap-1.5">
                          <Clock3 size={15} className="text-[#533afd]" />
                          {prestation.durationMinutes} min
                        </span>
                      )}
                    </div>

                    {/* TARIF ET LIEN */}

                    <div className="mt-auto mt-6 flex items-end justify-between gap-3 border-t border-slate-100 pt-5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Tarif
                        </p>

                        <p className="mt-1 break-words text-xl font-bold tracking-tight text-[#061b31]">
                          {formatPrice(
                            prestation.price,
                            prestation.currency,
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/p/${prestation.profile.slug}`}
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#533afd] px-4 text-xs font-bold text-white transition hover:bg-[#4229e8]"
                      >
                        Voir
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (

            /* AUCUN RÉSULTAT */

            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                <BriefcaseBusiness size={30} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#061b31]">
                Aucune prestation trouvée
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                Essayez une autre recherche ou retirez certains filtres
                pour découvrir davantage de prestations.
              </p>

              <Link
                href="/recherche"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#533afd] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#533afd]/20 transition hover:bg-[#4229e8]"
              >
                Voir toutes les prestations
                <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
        </section>

        {/* RETOUR À L'ACCUEIL */}

        <div className="mt-14 border-t border-slate-200 pt-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#533afd]"
          >
            <ArrowRight size={16} className="rotate-180" />
            Retour à l'accueil
          </Link>
        </div>
      </div>

      {/* FOOTER */}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-7 text-center sm:flex-row sm:px-8 sm:text-left">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-[#061b31]"
          >
            Reserve<span className="text-[#533afd]">X</span>
          </Link>

          <p className="text-xs text-slate-400">
            © 2026 Reserve X. Tous droits réservés.
          </p>

          <p className="text-xs text-slate-400">
            Réserver simplement. Profiter pleinement.
          </p>
        </div>
      </footer>
    </main>
  );
}