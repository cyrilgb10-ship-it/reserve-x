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
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="mb-5 text-[12px] tracking-[1.5px] text-[#839bc8]">
            NOTRE SÉLECTION
          </p>

          <h2 className="text-[40px] font-light leading-[1.08] tracking-[-1.5px] sm:text-[48px]">
            Voir les prestations.
          </h2>

          <p className="mt-5 max-w-[500px] text-[16px] leading-[1.7] text-[#64748d]">
            Trouvez exactement ce que vous recherchez parmi les services
            proposés par nos professionnels.
          </p>
        </div>

        <span className="text-[13px] text-[#64748d]">
          {filteredPrestations.length} prestation
          {filteredPrestations.length > 1 ? "s" : ""} disponible
          {filteredPrestations.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* BARRE DE RECHERCHE */}

      <div className="rx-panel mt-10 border border-[#e5edf5] bg-[#f8fafd] p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          <label className="rx-search flex h-12 items-center gap-3 border border-[#e5edf5] bg-white px-4">
            <Search size={18} className="shrink-0 text-[#533afd]" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quelle prestation recherchez-vous ?"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#839bc8]"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
                className="text-[#839bc8] hover:text-[#533afd]"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <label className="rx-search flex h-12 items-center gap-3 border border-[#e5edf5] bg-white px-4">
            <MapPin size={18} className="shrink-0 text-[#533afd]" />

            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Votre ville"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#839bc8]"
            />
          </label>

          <label className="rx-search flex h-12 items-center gap-3 border border-[#e5edf5] bg-white px-4">
            <SlidersHorizontal
              size={18}
              className="shrink-0 text-[#533afd]"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full bg-transparent text-[14px] outline-none"
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

        {(search || city || category !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCity("");
              setCategory("ALL");
            }}
            className="mt-4 text-[12px] text-[#533afd] hover:text-[#7389ff]"
          >
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
              className="rx-card group flex flex-col border border-[#e5edf5] bg-white p-6"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[9px] bg-[#e8e9ff] text-[#533afd] transition-transform duration-300 group-hover:rotate-[-7deg]">
                  <BriefcaseBusiness size={20} strokeWidth={1.5} />
                </span>

                <span className="rounded-full border border-[#e5edf5] px-3 py-1.5 text-[11px] text-[#64748d]">
                  {categoryLabels[prestation.profile.category] ??
                    "Autres services"}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-[19px] font-normal tracking-[-.4px]">
                  {prestation.name}
                </h3>

                <p className="mt-2 text-[13px] text-[#533afd]">
                  {prestation.profile.businessName}
                </p>

                {prestation.description && (
                  <p className="mt-4 line-clamp-2 text-[13px] leading-[1.7] text-[#64748d]">
                    {prestation.description}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[#e5edf5] pt-5 text-[12px] text-[#64748d]">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#533afd]" />
                  {prestation.profile.city}
                </span>

                {prestation.durationMinutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock3 size={14} className="text-[#533afd]" />
                    {prestation.durationMinutes} min
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-[#839bc8]">
                    À PARTIR DE
                  </p>

                  <p className="mt-1 text-[20px] font-normal tracking-[-.5px]">
                    {formatPrice(prestation.price, prestation.currency)}
                  </p>
                </div>

                <Link
                  href={`/p/${prestation.profile.slug}`}
                  className="rx-button inline-flex h-10 items-center gap-2 bg-[#533afd] px-4 text-[12px] text-white hover:bg-[#7389ff]"
                >
                  Voir
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rx-panel mt-10 flex flex-col items-center border border-[#e5edf5] bg-[#f8fafd] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#e8e9ff] text-[#533afd]">
            <Search size={23} />
          </span>

          <h3 className="mt-6 text-[20px] font-light">
            Aucune prestation trouvée
          </h3>

          <p className="mt-3 max-w-[360px] text-[14px] leading-[1.7] text-[#64748d]">
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
            className="rx-button mt-6 inline-flex h-11 items-center gap-2 border border-[#b9b9f9] px-5 text-[13px] text-[#533afd] hover:bg-[#e8e9ff]"
          >
            <X size={15} />
            Réinitialiser la recherche
          </button>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#e5edf5] pt-7 sm:flex-row">
        <p className="text-[13px] text-[#64748d]">
          Vous êtes professionnel et souhaitez proposer vos services ?
        </p>

        <Link
          href="/pro/inscription"
          className="inline-flex items-center gap-2 text-[13px] text-[#533afd] transition-all hover:gap-3"
        >
          Rejoindre Reserve X
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}