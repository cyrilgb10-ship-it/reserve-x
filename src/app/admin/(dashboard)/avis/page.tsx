import Link from "next/link";
import { connection } from "next/server";
import {
  Star,
  MessageSquare,
  TrendingUp,
  Award,
  Search,
  ExternalLink,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

export const metadata = {
  title: "Avis clients | Administration Reserve X",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={15}
          className={
            value <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-slate-200"
          }
        />
      ))}
    </div>
  );
}

function formatAverage(value: number | null) {
  return value === null ? "—" : value.toFixed(1).replace(".", ",");
}

export default async function AdminAvisPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    rating?: string;
  }>;
}) {
  await connection();

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const ratingFilter = params.rating ?? "ALL";

  const [reviews, aggregate, ratingGroups] = await Promise.all([
    prisma.review.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        profile: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            city: true,
          },
        },
        booking: {
          select: {
            reference: true,
            customerFirstName: true,
            customerLastName: true,
            customerEmail: true,
            customerPhone: true,
          },
        },
      },
    }),

    prisma.review.aggregate({
      _count: {
        _all: true,
      },
      _avg: {
        rating: true,
      },
    }),

    prisma.review.groupBy({
      by: ["rating"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const totalReviews = aggregate._count._all;
  const averageRating = aggregate._avg.rating;

  const ratingCounts = new Map(
    ratingGroups.map((group) => [group.rating, group._count._all]),
  );

  const fiveStarCount = ratingCounts.get(5) ?? 0;
  const lowRatingCount =
    (ratingCounts.get(1) ?? 0) + (ratingCounts.get(2) ?? 0);

  const filteredReviews = reviews.filter((review) => {
    const matchesRating =
      ratingFilter === "ALL" ||
      review.rating === Number(ratingFilter);

    const searchableText = [
      review.profile.businessName,
      review.profile.city,
      review.booking.reference,
      review.booking.customerFirstName,
      review.booking.customerLastName,
      review.booking.customerEmail,
      review.booking.customerPhone,
      review.comment ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchableText.includes(search.toLowerCase());

    return matchesRating && matchesSearch;
  });

  const ratingOptions = [
    { value: "ALL", label: "Toutes les notes" },
    { value: "5", label: "5 étoiles" },
    { value: "4", label: "4 étoiles" },
    { value: "3", label: "3 étoiles" },
    { value: "2", label: "2 étoiles" },
    { value: "1", label: "1 étoile" },
  ];

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Administration</span>
          <span>/</span>
          <span className="text-slate-900">Avis clients</span>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight text-[#061b31]">
            Avis clients
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Consultez les évaluations laissées par les clients sur les
            établissements Reserve X.
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total des avis</p>
            <MessageSquare size={19} className="text-indigo-600" />
          </div>

          <p className="mt-3 text-2xl font-semibold text-[#061b31]">
            {totalReviews}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Avis publiés par les clients
          </p>
        </div>

        <div className="rounded-lg border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Note moyenne</p>
            <Star size={19} className="fill-amber-400 text-amber-400" />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <p className="text-2xl font-semibold text-[#061b31]">
              {formatAverage(averageRating)}
            </p>

            <span className="text-sm text-slate-400">/ 5</span>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Moyenne de toutes les évaluations
          </p>
        </div>

        <div className="rounded-lg border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Avis 5 étoiles</p>
            <Award size={19} className="text-emerald-600" />
          </div>

          <p className="mt-3 text-2xl font-semibold text-[#061b31]">
            {fiveStarCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Évaluations maximales
          </p>
        </div>

        <div className="rounded-lg border border-[#e5edf5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Avis défavorables</p>
            <TrendingUp size={19} className="text-rose-600" />
          </div>

          <p className="mt-3 text-2xl font-semibold text-[#061b31]">
            {lowRatingCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Notes de 1 ou 2 étoiles
          </p>
        </div>
      </div>

      {/* Liste des avis */}
      <div className="overflow-hidden rounded-lg border border-[#e5edf5] bg-white">
        <div className="border-b border-[#e5edf5] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-[#061b31]">
                Évaluations reçues
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Les 100 avis les plus récents.
              </p>
            </div>

            <form
              method="GET"
              className="flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  name="q"
                  defaultValue={search}
                  placeholder="Rechercher un avis..."
                  className="h-10 w-full rounded border border-[#e5edf5] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#533afd] sm:w-64"
                />
              </div>

              <select
                name="rating"
                defaultValue={ratingFilter}
                className="h-10 rounded border border-[#e5edf5] bg-white px-3 text-sm outline-none focus:border-[#533afd]"
              >
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="h-10 rounded bg-[#061b31] px-4 text-sm font-medium text-white transition hover:bg-[#102d4a]"
              >
                Filtrer
              </button>
            </form>
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <MessageSquare
              size={32}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-medium text-[#061b31]">
              Aucun avis trouvé
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Aucun avis ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5edf5]">
            {filteredReviews.map((review) => {
              const customerName = [
                review.booking.customerFirstName,
                review.booking.customerLastName,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={review.id}
                  className="p-5 transition hover:bg-[#f8fafd]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <Stars rating={review.rating} />

                        <span className="text-sm font-semibold text-[#061b31]">
                          {review.rating}/5
                        </span>

                        <span className="text-xs text-slate-400">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="font-medium text-[#061b31]">
                          {review.profile.businessName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {review.profile.city}
                        </p>
                      </div>

                      {review.comment ? (
                        <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          « {review.comment} »
                        </p>
                      ) : (
                        <p className="mt-4 text-sm italic text-slate-400">
                          Aucun commentaire laissé.
                        </p>
                      )}
                    </div>

                    <div className="w-full shrink-0 rounded border border-[#e5edf5] bg-[#f8fafd] p-4 lg:w-72">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Client
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#061b31]">
                        {customerName || "Client"}
                      </p>

                      {review.booking.customerEmail && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {review.booking.customerEmail}
                        </p>
                      )}

                      <div className="mt-4 border-t border-[#e5edf5] pt-3">
                        <p className="text-xs text-slate-400">
                          Réservation
                        </p>

                        <p className="mt-1 text-sm font-medium text-[#061b31]">
                          {review.booking.reference}
                        </p>
                      </div>

                      <Link
                        href={`/p/${review.profile.slug}`}
                        target="_blank"
                        className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#533afd] hover:underline"
                      >
                        Voir l’établissement
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-[#e5edf5] px-5 py-4">
          <p className="text-xs text-slate-400">
            {filteredReviews.length} avis affiché
            {filteredReviews.length > 1 ? "s" : ""}
            {" · "}
            {totalReviews} avis au total
          </p>
        </div>
      </div>
    </div>
  );
}