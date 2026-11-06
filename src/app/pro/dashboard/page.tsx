import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Wallet,
  Settings,
  ArrowRight,
  Plus,
  UserRound,
  LayoutDashboard,
  Store,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  BriefcaseBusiness,
  Star,
  MessageSquareText,
  Headset,
} from "lucide-react";

import type { ReactNode } from "react";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MobileMenu from "@/components/pro/MobileMenu";
import PublishProfileButton from "@/components/pro/PublishProfileButton";
import PushNotifications from "@/components/PushNotifications";

export const instant = false;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAmount(amount: number, currency = "XOF") {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency}`;
}

function getLastSevenDays() {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - i);
    days.push(date);
  }

  return days;
}

function getBookingStatus(status: string) {
  switch (status) {
    case "PENDING_PAYMENT":
      return {
        label: "En attente de paiement",
        className: "bg-amber-50 text-amber-700 ring-amber-100",
      };

    case "CONFIRMED":
      return {
        label: "Confirmée",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };

    case "COMPLETED":
      return {
        label: "Terminée",
        className: "bg-blue-50 text-blue-700 ring-blue-100",
      };

    case "CANCELLED":
      return {
        label: "Annulée",
        className: "bg-red-50 text-red-700 ring-red-100",
      };

    case "EXPIRED":
      return {
        label: "Expirée",
        className: "bg-slate-100 text-slate-600 ring-slate-200",
      };

    case "REFUNDED":
      return {
        label: "Remboursée",
        className: "bg-purple-50 text-purple-700 ring-purple-100",
      };

    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

/* ÉTOILES */

function RatingStars({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Note de ${rating} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-100 text-slate-200"
          }
        />
      ))}
    </div>
  );
}

/* GRAPHIQUE */

function BookingChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const width = 760;
  const height = 260;
  const left = 35;
  const right = 20;
  const top = 25;
  const bottom = 45;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maxValue = Math.max(4, ...data.map((item) => item.value));

  const points = data.map((item, index) => {
    const x = left + (index * chartWidth) / (data.length - 1);
    const y = top + chartHeight - (item.value / maxValue) * chartHeight;

    return { x, y, ...item };
  });

  const linePoints = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const areaPoints = [
    `${points[0].x},${top + chartHeight}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1].x},${top + chartHeight}`,
  ].join(" ");

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#061b31]">
            Évolution des réservations
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Activité des 7 derniers jours
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-[#533afd]/10 px-4 py-2 text-xs font-bold text-[#533afd]">
          <span className="h-2 w-2 rounded-full bg-[#533afd]" />
          Réservations
        </span>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Graphique des réservations des sept derniers jours"
        >
          <defs>
            <linearGradient
              id="bookingGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#533afd" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((index) => {
            const y = top + (chartHeight * index) / 3;

            return (
              <g key={index}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="#e9edf5"
                  strokeDasharray="4 5"
                />

                <text
                  x={left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {Math.round(maxValue - (maxValue * index) / 3)}
                </text>
              </g>
            );
          })}

          <polygon points={areaPoints} fill="url(#bookingGradient)" />

          <polyline
            points={linePoints}
            fill="none"
            stroke="#533afd"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="white"
                stroke="#533afd"
                strokeWidth="3"
              />

              <text
                x={point.x}
                y={height - 13}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {data.every((item) => item.value === 0) && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Aucune réservation enregistrée sur cette période.
        </p>
      )}
    </div>
  );
}

export default async function DashboardProPage() {
  const session = await getSession();

  if (!session || session.role !== "PROFESSIONAL") {
    redirect("/pro/connexion");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,

      profile: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          isPublished: true,

          services: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
            },
          },

          bookings: {
            select: {
              id: true,
              reference: true,
              customerFirstName: true,
              customerLastName: true,
              startsAt: true,
              amount: true,
              currency: true,
              status: true,
              createdAt: true,

              service: {
                select: {
                  name: true,
                },
              },

              paymentAttempt: true,

              payments: {
                orderBy: {
                  attemptNumber: "desc",
                },
                take: 1,
                select: {
                  attemptNumber: true,
                  amount: true,
                  currency: true,
                  status: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
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

              booking: {
                select: {
                  customerFirstName: true,
                  customerLastName: true,

                  service: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },

          _count: {
            select: {
              reviews: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/pro/connexion");
  }

  const profile = user.profile;
  const bookings = profile?.bookings ?? [];

  /* STATISTIQUES DES AVIS */

  const reviews = profile?.reviews ?? [];
  const totalReviews = profile?._count.reviews ?? 0;

  const reviewStats = profile
    ? await prisma.review.aggregate({
        where: {
          profileId: profile.id,
        },
        _avg: {
          rating: true,
        },
      })
    : null;

  const averageRating = reviewStats?._avg.rating ?? null;

  /* STATISTIQUES GÉNÉRALES */

  const totalServices = profile?.services.length ?? 0;
  const totalBookings = bookings.length;

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "PENDING_PAYMENT"
  ).length;

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED"
  ).length;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED"
  ).length;

  const totalRevenue = bookings.reduce((total, booking) => {
    const latestPayment = booking.payments[0];

    if (
      latestPayment &&
      latestPayment.attemptNumber === booking.paymentAttempt &&
      latestPayment.status === "SUCCESS"
    ) {
      return total + latestPayment.amount;
    }

    return total;
  }, 0);

  const revenueCurrency =
    bookings.find((booking) => {
      const latestPayment = booking.payments[0];

      return (
        latestPayment &&
        latestPayment.attemptNumber === booking.paymentAttempt &&
        latestPayment.status === "SUCCESS"
      );
    })?.payments[0]?.currency ?? "XOF";

  const recentBookings = bookings.slice(0, 5);

  const lastSevenDays = getLastSevenDays();

  const chartData = lastSevenDays.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = bookings.filter((booking) => {
      return booking.createdAt >= date && booking.createdAt < nextDay;
    }).length;

    return {
      label: new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
      }).format(date),
      value: count,
    };
  });

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#061b31]">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white lg:flex">
        <Link
          href="/"
          className="flex h-20 items-center gap-3 border-b border-slate-100 px-7 text-2xl font-extrabold tracking-tight"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#654cff] to-[#4229e8] text-white shadow-lg shadow-[#533afd]/20">
            R
          </span>
          Reserve<span className="text-[#533afd]">X</span>
        </Link>

        <div className="flex-1 px-4 py-8">
          <p className="mb-4 px-3 text-[10px] font-extrabold uppercase tracking-[2px] text-slate-400">
            Espace professionnel
          </p>

          <nav className="space-y-2">
            <SidebarLink
              href="/pro/dashboard"
              icon={<LayoutDashboard size={19} />}
              label="Tableau de bord"
              active
            />

            <SidebarLink
              href="/pro/profil"
              icon={<Store size={19} />}
              label="Mon établissement"
            />

            <SidebarLink
              href="/pro/prestations"
              icon={<Building2 size={19} />}
              label="Mes prestations"
            />

            <SidebarLink
              href="/pro/reservations"
              icon={<CalendarDays size={19} />}
              label="Réservations"
            />

            <SidebarLink
              href="/pro/portefeuille"
              icon={<Wallet size={19} />}
              label="Portefeuille"
            />

            <SidebarLink
              href="/pro/abonnement"
              icon={<Settings size={19} />}
              label="Abonnement"
            />
          </nav>
        </div>

        <div className="border-t border-slate-100 p-5">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#533afd]"
          >
            <ArrowRight size={18} />
            Retour au site
          </Link>
        </div>
      </aside>

      {/* CONTENU */}
      <div className="lg:pl-64">
        {/* HEADER */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <MobileMenu />

            <div>
              <p className="text-xs font-medium text-slate-400">
                Espace professionnel
              </p>
              <h1 className="mt-1 text-base font-extrabold sm:text-lg">
                Tableau de bord
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#654cff]/15 to-[#533afd]/5 text-[#533afd]">
              <UserRound size={21} />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
          {/* BIENVENUE */}
          <section className="mb-9">
            <p className="text-sm font-semibold text-[#533afd]">
              {formatDate(new Date())}
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl">
              Bonjour, {user.name.split(" ")[0]} !
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Voici un aperçu de votre activité sur Reserve X.
            </p>
          </section>

          {/* NOTIFICATIONS PUSH */}
          <section className="mb-9">
            <PushNotifications />
          </section>

          {/* SERVICE CLIENT */}
          <section className="mb-9">
            <a
              href="https://wa.me/22898126142"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between gap-4 rounded-2xl border border-[#533afd]/15 bg-white p-5 transition hover:border-[#533afd]/40 sm:flex-row sm:items-center sm:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                  <Headset size={23} />
                </div>

                <div>
                  <h3 className="font-extrabold text-[#061b31]">
                    Besoin d'aide ?
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Notre service client est disponible pour vous accompagner.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#533afd] px-5 py-3 text-sm font-bold text-white transition group-hover:bg-[#4229e8]">
                Contacter le service client
                <ArrowUpRight size={17} />
              </span>
            </a>
          </section>

          {/* PROFIL NON CRÉÉ */}
          {!profile && (
            <section className="relative mb-9 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b31] via-[#142d52] to-[#533afd] p-7 text-white shadow-xl shadow-[#061b31]/10 sm:p-10">
              <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[35px] border-white/5" />
              <div className="pointer-events-none absolute -bottom-24 right-40 h-64 w-64 rounded-full bg-[#8b7aff]/20 blur-3xl" />

              <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-indigo-100">
                  <Sparkles size={15} />
                  Bienvenue sur Reserve X
                </span>

                <h3 className="mt-6 text-2xl font-extrabold leading-tight sm:text-4xl">
                  Votre activité mérite d'être visible.
                </h3>

                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                  Créez votre profil professionnel, présentez vos services
                  et permettez à vos futurs clients de réserver en ligne.
                </p>

                <Link
                  href="/pro/profil"
                  className="mt-7 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-4 text-sm font-extrabold text-[#533afd] shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
                >
                  Créer mon établissement
                  <ArrowRight size={18} />
                </Link>
              </div>
            </section>
          )}

          {/* PROFIL EXISTANT */}
          {profile && (
            <section className="mb-9 overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                    <BriefcaseBusiness size={25} />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-extrabold">
                        {profile.businessName}
                      </h3>

                      {profile.isPublished ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={13} />
                          Publié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          <Clock size={13} />
                          Non publié
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {profile.isPublished
                        ? "Votre établissement est visible sur Reserve X."
                        : "Votre établissement n'est pas encore publié."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {profile.isPublished && (
                    <Link
                      href={`/p/${profile.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#533afd]/10 px-4 py-3 text-sm font-bold text-[#533afd] transition hover:bg-[#533afd]/15"
                    >
                      Voir ma page
                      <ArrowUpRight size={16} />
                    </Link>
                  )}

                  <Link
                    href="/pro/profil"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold transition hover:border-[#533afd]/30 hover:bg-slate-50"
                  >
                    Gérer mon profil
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {!profile.isPublished && (
                <div className="border-t border-slate-100 bg-amber-50/50 px-6 py-4 sm:px-8">
                  <PublishProfileButton />
                </div>
              )}
            </section>
          )}

          {/* STATISTIQUES */}
          <section>
            <div className="mb-5">
              <h3 className="text-lg font-extrabold">Vue d'ensemble</h3>
              <p className="mt-1 text-sm text-slate-400">
                Les chiffres clés de votre établissement.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
              <StatCard
                title="Prestations actives"
                value={totalServices}
                icon={<Building2 size={21} />}
                description="Services proposés"
                color="violet"
              />

              <StatCard
                title="Réservations"
                value={totalBookings}
                icon={<CalendarDays size={21} />}
                description="Toutes les réservations"
                color="blue"
              />

              <StatCard
                title="En attente"
                value={pendingBookings}
                icon={<Clock size={21} />}
                description="Réservations à traiter"
                color="amber"
              />

              <StatCard
                title="Confirmées"
                value={confirmedBookings}
                icon={<CheckCircle2 size={21} />}
                description="Réservations confirmées"
                color="green"
              />

              <StatCard
                title="Chiffre d'affaires"
                value={formatAmount(totalRevenue, revenueCurrency)}
                icon={<Wallet size={21} />}
                description="Paiements réussis uniquement"
                highlight
                color="violet"
              />

              <StatCard
                title="Note moyenne"
                value={
                  averageRating !== null
                    ? `${averageRating.toFixed(1).replace(".", ",")} / 5`
                    : "Aucune note"
                }
                icon={<Star size={21} />}
                description={`${totalReviews} avis client${totalReviews > 1 ? "s" : ""}`}
                color="amber"
              />
            </div>
          </section>

          {/* GRAPHIQUE */}
          <section className="mt-9 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                <TrendingUp size={23} />
              </div>

              <div>
                <h3 className="font-extrabold">
                  Analyse de votre activité
                </h3>
                <p className="text-xs text-slate-400">
                  Suivez vos performances en un coup d'œil.
                </p>
              </div>
            </div>

            <BookingChart data={chartData} />
          </section>

          {/* AVIS CLIENTS */}
          {profile && (
            <section className="mt-10">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-extrabold">
                    Avis de vos clients
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Découvrez les retours de vos clients sur vos prestations.
                  </p>
                </div>

                {profile.isPublished && (
                  <Link
                    href={`/p/${profile.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#533afd] hover:underline"
                  >
                    Voir les avis publics
                    <ArrowUpRight size={16} />
                  </Link>
                )}
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
                {/* RÉSUMÉ DES AVIS */}
                <div className="flex flex-col gap-5 border-b border-slate-100 bg-slate-50/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Note globale
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-4xl font-extrabold text-[#061b31]">
                        {averageRating !== null
                          ? averageRating.toFixed(1).replace(".", ",")
                          : "—"}
                      </span>

                      <div>
                        <RatingStars
                          rating={
                            averageRating !== null
                              ? Math.round(averageRating)
                              : 0
                          }
                          size={19}
                        />

                        <p className="mt-1 text-xs text-slate-500">
                          Sur 5 étoiles
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                      <MessageSquareText size={22} />
                    </div>

                    <div>
                      <p className="text-2xl font-extrabold text-[#061b31]">
                        {totalReviews}
                      </p>
                      <p className="text-xs text-slate-500">
                        Avis reçu{totalReviews > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* LISTE DES AVIS */}
                {reviews.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {reviews.map((review) => {
                      const customerName =
                        `${review.booking.customerFirstName} ${review.booking.customerLastName}`.trim();

                      return (
                        <article
                          key={review.id}
                          className="p-5 sm:p-6"
                        >
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#533afd]/10 text-sm font-extrabold text-[#533afd]">
                                {customerName
                                  .charAt(0)
                                  .toUpperCase() || "C"}
                              </div>

                              <div className="min-w-0">
                                <h4 className="truncate font-extrabold text-[#061b31]">
                                  {customerName || "Client"}
                                </h4>

                                <p className="mt-1 text-xs text-slate-500">
                                  Prestation : {review.booking.service.name}
                                </p>

                                <div className="mt-2">
                                  <RatingStars
                                    rating={review.rating}
                                  />
                                </div>
                              </div>
                            </div>

                            <span className="shrink-0 text-xs text-slate-400">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>

                          <div className="mt-4 pl-0 sm:pl-14">
                            {review.comment ? (
                              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                {review.comment}
                              </p>
                            ) : (
                              <p className="text-sm italic text-slate-400">
                                Ce client n'a pas laissé de commentaire.
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500">
                      <Star size={28} />
                    </div>

                    <h4 className="mt-5 font-extrabold">
                      Aucun avis pour le moment
                    </h4>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Lorsque vos clients auront terminé une réservation
                      et partagé leur expérience, leurs avis apparaîtront ici.
                    </p>
                  </div>
                )}

                {totalReviews > reviews.length && (
                  <div className="border-t border-slate-100 px-6 py-4 text-center">
                    <p className="text-xs text-slate-400">
                      Les {reviews.length} avis les plus récents sont affichés.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* DERNIÈRES RÉSERVATIONS */}
          <section className="mt-10">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-extrabold">
                  Dernières réservations
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Les dernières demandes reçues par votre établissement.
                </p>
              </div>

              <Link
                href="/pro/reservations"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#533afd] hover:underline"
              >
                Toutes les réservations
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
              {recentBookings.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentBookings.map((booking) => {
                    const status = getBookingStatus(booking.status);

                    return (
                      <div
                        key={booking.id}
                        className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                            <UserRound size={21} />
                          </div>

                          <div className="min-w-0">
                            <h4 className="truncate font-extrabold">
                              {booking.customerFirstName}{" "}
                              {booking.customerLastName}
                            </h4>

                            <p className="mt-1 truncate text-sm text-slate-500">
                              {booking.service.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Réf. {booking.reference}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                          <div>
                            <p className="text-sm font-extrabold">
                              {formatAmount(
                                booking.amount,
                                booking.currency
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDateTime(booking.startsAt)}
                            </p>
                          </div>

                          <span
                            className={`inline-flex rounded-full px-3 py-2 text-xs font-bold ring-1 ring-inset ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#533afd]/10 text-[#533afd]">
                    <CalendarDays size={27} />
                  </div>

                  <h4 className="mt-5 font-extrabold">
                    Aucune réservation pour le moment
                  </h4>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Vos nouvelles réservations apparaîtront ici dès que
                    vos clients commenceront à réserver.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ACTIONS RAPIDES */}
          <section className="mt-10">
            <div className="mb-5">
              <h3 className="text-xl font-extrabold">Actions rapides</h3>
              <p className="mt-1 text-sm text-slate-500">
                Accédez rapidement aux fonctionnalités principales.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <QuickAction
                href="/pro/profil"
                icon={<Store size={22} />}
                title="Mon établissement"
                description="Configurez les informations de votre activité."
              />

              <QuickAction
                href="/pro/prestations"
                icon={<Plus size={22} />}
                title="Ajouter une prestation"
                description="Présentez vos services et définissez vos tarifs."
              />

              <QuickAction
                href="/pro/reservations"
                icon={<CalendarDays size={22} />}
                title="Mes réservations"
                description="Consultez et gérez vos demandes de réservation."
              />
            </div>
          </section>

          {/* CONSEIL */}
          <section className="relative mt-10 overflow-hidden rounded-[1.75rem] border border-[#533afd]/10 bg-gradient-to-r from-[#533afd]/5 to-indigo-50/50 p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#533afd]/5 blur-2xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#533afd] shadow-sm">
                <Sparkles size={23} />
              </div>

              <div>
                <h4 className="font-extrabold text-[#061b31]">
                  Faites briller votre établissement.
                </h4>

                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  Complétez votre profil, ajoutez des prestations attractives
                  et publiez votre établissement pour permettre aux clients
                  de vous découvrir sur Reserve X.
                </p>
              </div>
            </div>
          </section>

          <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
            © 2026 Reserve X — Espace professionnel.
          </footer>
        </div>
      </div>
    </main>
  );
}

/* LIEN SIDEBAR */

function SidebarLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-[#533afd]/10 text-[#533afd]"
          : "text-slate-500 hover:bg-slate-50 hover:text-[#533afd]"
      }`}
    >
      {icon}
      {label}
      {active && (
        <span className="ml-auto h-2 w-2 rounded-full bg-[#533afd]" />
      )}
    </Link>
  );
}

/* CARTE STATISTIQUE */

function StatCard({
  title,
  value,
  icon,
  description,
  highlight = false,
  color = "violet",
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  description: string;
  highlight?: boolean;
  color?: "violet" | "blue" | "amber" | "green";
}) {
  const iconColors = {
    violet: "bg-[#533afd]/10 text-[#533afd]",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div
      className={`group rounded-[1.5rem] border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6 ${
        highlight
          ? "border-[#533afd]/20 bg-gradient-to-br from-white to-[#533afd]/5 shadow-sm"
          : "border-slate-100 bg-white shadow-sm hover:shadow-slate-200/50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-500">
          {title}
        </span>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconColors[color]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 break-words text-2xl font-extrabold tracking-tight text-[#061b31] sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

/* ACTION RAPIDE */

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#533afd]/20 hover:shadow-xl hover:shadow-slate-200/50"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd] transition duration-300 group-hover:bg-[#533afd] group-hover:text-white">
        {icon}
      </div>

      <h4 className="mt-5 font-extrabold text-[#061b31]">{title}</h4>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-2 text-xs font-extrabold text-[#533afd]">
        Accéder
        <ArrowRight
          size={15}
          className="transition group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}