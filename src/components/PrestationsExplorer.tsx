"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  ArrowUpRight,
  Clock3,
  BriefcaseBusiness,
  X,
  Sparkles,
} from "lucide-react";

type Prestation = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  profile: {
    businessName: string;
    slug: string;
    city: string;
    category: string;
  };
};

const categoryLabels: Record<string, string> = {
  HOTEL: "Hôtels & hébergements",
  RESTAURANT: "Restaurants",
  EVENT: "Événements",
  VENUE: "Location de salles",
  PHOTOGRAPHY: "Photographie",
  BEAUTY: "Beauté & bien-être",
  VEHICLE: "Location de véhicules",
  TRANSPORT: "Transport",
  MECHANIC: "Mécanique",
  TECHNICIAN: "Techniciens",
  ARTISAN: "Artisans",
  OTHER: "Autres services",
};

function formatPrice(price: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(price)} ${currency}`;
}

export default function PrestationsExplorer({
  prestations,
}: {
  prestations: Prestation[];
}) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("ALL");

  const filteredPrestations = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const cityValue = city.trim().toLowerCase();

    return prestations.filter((prestation) => {
      const matchesSearch =
        !searchValue ||
        prestation.name.toLowerCase().includes(searchValue) ||
        prestation.profile.businessName.toLowerCase().includes(searchValue) ||
        (prestation.description ?? "").toLowerCase().includes(searchValue);

      const matchesCity =
        !cityValue ||
        prestation.profile.city.toLowerCase().includes(cityValue);

      const matchesCategory =
        category === "ALL" ||
        prestation.profile.category === category;

      return matchesSearch && matchesCity && matchesCategory;
    });
  }, [prestations, search, city, category]);

  return (
    <section id="prestations" className="mt-24 scroll-mt-28">

      {/* EN-TÊTE */}

      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[1.5px] text-[#533afd]">
            Notre sélection
          </p>

          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#061b31] sm:text-4xl">
            Voir les prestations.
          </h2>

          <p className="mt-5 max-w-[500px] text-sm leading-7 text-slate-500 sm:text-base">
            Trouvez exactement ce que vous recherchez parmi les services
            proposés par nos professionnels.
          </p>
        </div>

        <span className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500">
          {filteredPrestations.length} prestation
          {filteredPrestations.length > 1 ? "s" : ""} disponible
          {filteredPrestations.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* BARRE DE RECHERCHE */}

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">

          {/* RECHERCHE PAR PRESTATION */}

          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#533afd] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#533afd]/10">
            <Search size={18} className="shrink-0 text-[#533afd]" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quelle prestation recherchez-vous ?"
              className="w-full bg-transparent text-sm text-[#061b31] outline-none placeholder:text-slate-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
                className="rounded-md p-1 text-slate-400 transition hover:bg-[#533afd]/10 hover:text-[#533afd]"
              >
                <X size={16} />
              </button>
            )}
          </label>

          {/* RECHERCHE PAR VILLE */}

          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#533afd] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#533afd]/10">
            <MapPin size={18} className="shrink-0 text-[#533afd]" />

            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Votre ville"
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
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full bg-transparent text-sm text-[#061b31] outline-none"
            >
              <option value="ALL">Toutes les catégories</option>

              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* RÉINITIALISATION */}

        {(search || city || category !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCity("");
              setCategory("ALL");
            }}
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#533afd] transition hover:text-[#4229e8]"
          >
            <X size={14} />
            Effacer tous les filtres
          </button>
        )}
      </div>

      {/* RÉSULTATS */}

      {filteredPrestations.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrestations.map((prestation, index) => (
            <article
              key={prestation.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#533afd]/30 hover:shadow-xl hover:shadow-slate-200/50"
              style={{ animationDelay: `${index * 60}ms` }}
            >

              {/* ICÔNE ET CATÉGORIE */}

              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd] transition duration-300 group-hover:bg-[#533afd] group-hover:text-white">
                  <BriefcaseBusiness size={20} strokeWidth={1.7} />
                </span>

                <span className="max-w-[65%] rounded-full border border-[#533afd]/10 bg-[#533afd]/5 px-3 py-1.5 text-[11px] font-semibold text-[#533afd]">
                  {categoryLabels[prestation.profile.category] ??
                    "Autres services"}
                </span>
              </div>

              {/* INFORMATIONS */}

              <div className="mt-6">
                <h3 className="text-lg font-bold tracking-tight text-[#061b31]">
                  {prestation.name}
                </h3>

                <p className="mt-2 text-sm font-semibold text-[#533afd]">
                  {prestation.profile.businessName}
                </p>

                {prestation.description && (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                    {prestation.description}
                  </p>
                )}
              </div>

              {/* LOCALISATION ET DURÉE */}

              <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5 text-xs text-slate-500">
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

              <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    À partir de
                  </p>

                  <p className="mt-1 break-words text-xl font-bold tracking-tight text-[#061b31]">
                    {formatPrice(prestation.price, prestation.currency)}
                  </p>
                </div>

                <Link
                  href={`/p/${prestation.profile.slug}`}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#533afd] px-4 text-xs font-bold text-white shadow-md shadow-[#533afd]/20 transition hover:bg-[#4229e8]"
                >
                  Voir
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (

        /* AUCUN RÉSULTAT */

        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
            <Search size={23} />
          </span>

          <h3 className="mt-6 text-xl font-bold text-[#061b31]">
            Aucune prestation trouvée
          </h3>

          <p className="mt-3 max-w-[360px] text-sm leading-6 text-slate-500">
            Essayez de modifier votre recherche ou de choisir une autre
            catégorie.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCity("");
              setCategory("ALL");
            }}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-[#533afd]/30 px-5 text-sm font-semibold text-[#533afd] transition hover:bg-[#533afd]/5"
          >
            <X size={15} />
            Réinitialiser la recherche
          </button>
        </div>
      )}

      {/* LIEN PROFESSIONNELS */}

      <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-7 sm:flex-row sm:items-center">
        <p className="text-sm leading-6 text-slate-500">
          Vous êtes professionnel et souhaitez proposer vos services ?
        </p>

        <Link
          href="/pro/inscription"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#533afd] transition hover:gap-3 hover:text-[#4229e8]"
        >
          Rejoindre Reserve X
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}