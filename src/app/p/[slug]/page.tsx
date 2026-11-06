import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  MapPin,
  MessageSquareText,
  Sparkles,
  Star,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const instant = false;

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function RatingStars({
  rating,
  size = 17,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} sur 5 étoiles`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-100 text-slate-200"
          }
        />
      ))}
    </div>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();

  const { slug } = await params;

  const profile = await prisma.professionalProfile.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      id: true,
      businessName: true,
      slug: true,
      category: true,
      description: true,
      address: true,
      city: true,
      country: true,
      blueBadgeAt: true,

      services: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          durationMinutes: true,
        },
      },

      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      },

      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  // Calcul de la véritable moyenne sur TOUS les avis.
  // Seuls les 10 avis les plus récents sont affichés plus bas.
  const reviewStats = await prisma.review.aggregate({
    where: {
      profileId: profile.id,
    },
    _avg: {
      rating: true,
    },
  });

  const reviewCount = profile._count.reviews;

  const averageRating = reviewStats._avg.rating
    ? Math.round(reviewStats._avg.rating * 10) / 10
    : 0;

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#061b31]">

      {/* NAVIGATION */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#061b31]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#533afd] text-base font-bold text-white">
              R
            </span>
            Reserve<span className="text-[#533afd]">X</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-[#533afd]/5 hover:text-[#533afd]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Retour à l'accueil</span>
            <span className="sm:hidden">Accueil</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-16">

        {/* PROFIL PROFESSIONNEL */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-[#533afd] via-[#7465ff] to-[#061b31]" />

          <div className="p-6 sm:p-9 lg:p-11">
            <div className="flex flex-col gap-7 sm:flex-row sm:items-start">

              {/* ICÔNE */}

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                <BriefcaseBusiness size={29} strokeWidth={1.7} />
              </div>

              {/* INFORMATIONS */}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {categoryLabels[profile.category] ?? "Autres services"}
                  </span>

                  {profile.blueBadgeAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#533afd]/10 bg-[#533afd]/10 px-3 py-1.5 text-xs font-bold text-[#533afd]">
                      <BadgeCheck size={15} />
                      Professionnel vérifié
                    </span>
                  )}
                </div>

                <h1 className="mt-5 break-words text-3xl font-bold tracking-tight text-[#061b31] sm:text-4xl lg:text-5xl">
                  {profile.businessName}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <MapPin size={17} className="shrink-0 text-[#533afd]" />
                    {profile.city}, {profile.country}
                  </p>
                </div>

                {profile.address && (
                  <p className="mt-3 pl-6 text-sm text-slate-400">
                    {profile.address}
                  </p>
                )}

                {profile.description && (
                  <p className="mt-7 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
                    {profile.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* PRESTATIONS */}

        <section className="mt-14 sm:mt-16">

          {/* EN-TÊTE DE SECTION */}

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[2px] text-[#533afd]">
                <Sparkles size={15} />
                Nos prestations
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-[#061b31] sm:text-4xl">
                Choisissez votre service.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Découvrez les services proposés et réservez directement en
                ligne.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500">
              {profile.services.length} prestation
              {profile.services.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* LISTE DES PRESTATIONS */}

          {profile.services.length > 0 ? (
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              {profile.services.map((service) => (
                <article
                  key={service.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#533afd]/30 hover:shadow-xl hover:shadow-slate-200/60"
                >
                  <div className="flex flex-1 flex-col p-6 sm:p-7">

                    {/* ICÔNE */}

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd] transition group-hover:bg-[#533afd] group-hover:text-white">
                      <Sparkles size={21} strokeWidth={1.7} />
                    </div>

                    {/* NOM */}

                    <h3 className="mt-6 text-xl font-bold tracking-tight text-[#061b31]">
                      {service.name}
                    </h3>

                    {/* DESCRIPTION */}

                    {service.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                        {service.description}
                      </p>
                    )}

                    {/* DURÉE */}

                    <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5">
                      {service.durationMinutes && (
                        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                          <Clock3 size={16} className="text-[#533afd]" />
                          {service.durationMinutes} minutes
                        </span>
                      )}
                    </div>

                    {/* PRIX ET RÉSERVATION */}

                    <div className="mt-auto flex items-end justify-between gap-4 pt-7">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">
                          Tarif
                        </p>

                        <p className="mt-2 break-words text-xl font-bold tracking-tight text-[#061b31] sm:text-2xl">
                          {formatPrice(service.price, service.currency)}
                        </p>
                      </div>

                      <Link
                        href={`/reservation/${service.id}`}
                        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#533afd] px-4 text-sm font-bold text-white shadow-md shadow-[#533afd]/20 transition hover:bg-[#4229e8] sm:px-5"
                      >
                        Réserver
                        <ArrowUpRight size={17} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-9 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                <BriefcaseBusiness size={30} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#061b31]">
                Aucune prestation disponible
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                Ce professionnel n'a pas encore publié ses services.
              </p>
            </div>
          )}
        </section>

        {/* AVIS CLIENTS */}

        <section className="mt-16 sm:mt-20">

          {/* EN-TÊTE */}

          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[2px] text-[#533afd]">
              <MessageSquareText size={15} />
              Témoignages
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-[#061b31] sm:text-4xl">
              Avis de nos clients.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
              Découvrez les expériences des clients qui ont réalisé une
              prestation auprès de cet établissement.
            </p>
          </div>

          {/* STATISTIQUES */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-9">

            {reviewCount > 0 ? (
              <>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

                  {/* NOTE MOYENNE */}

                  <div className="sm:min-w-52">
                    <p className="text-5xl font-bold tracking-tight text-[#061b31]">
                      {averageRating.toFixed(1).replace(".", ",")}
                      <span className="text-xl text-slate-400">/5</span>
                    </p>

                    <div className="mt-3">
                      <RatingStars rating={averageRating} size={20} />
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      Basé sur {reviewCount} avis client
                      {reviewCount > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="hidden h-20 w-px bg-slate-200 sm:block" />

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#061b31]">
                      Ce que pensent nos clients
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Les notes sont calculées automatiquement à partir des
                      avis déposés après les prestations réalisées.
                    </p>
                  </div>
                </div>

                {/* LISTE DES AVIS */}

                <div className="mt-9 border-t border-slate-100 pt-8">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-[#061b31]">
                      Derniers avis
                    </h3>

                    <span className="text-xs font-medium text-slate-400">
                      {Math.min(reviewCount, 10)} sur {reviewCount}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {profile.reviews.map((review) => (
                      <article
                        key={review.id}
                        className="py-6 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#533afd]/10 text-[#533afd]">
                              <MessageSquareText size={18} />
                            </div>

                            <div>
                              <p className="text-sm font-bold text-[#061b31]">
                                Client Reserve X
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {formatDate(review.createdAt)}
                              </p>
                            </div>
                          </div>

                          <RatingStars rating={review.rating} />
                        </div>

                        {review.comment && (
                          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {review.comment}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                  <Star size={29} />
                </div>

                <h3 className="mt-5 text-xl font-bold text-[#061b31]">
                  Aucun avis pour le moment
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                  Cet établissement n'a pas encore reçu d'avis. Les clients
                  pourront partager leur expérience après avoir réalisé une
                  prestation.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* FOOTER */}

        <footer className="mt-16 border-t border-slate-200 pt-8 text-center sm:mt-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#061b31]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#533afd] text-sm text-white">
              R
            </span>
            Reserve<span className="text-[#533afd]">X</span>
          </Link>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Réservez vos services en toute simplicité.
          </p>
        </footer>
      </div>
    </main>
  );
}