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
} from "lucide-react";

import type { ReactNode } from "react";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MobileMenu from "@/components/pro/MobileMenu";

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
        className: "bg-amber-50 text-amber-700",
      };

    case "CONFIRMED":
      return {
        label: "Confirmée",
        className: "bg-emerald-50 text-emerald-700",
      };

    case "COMPLETED":
      return {
        label: "Terminée",
        className: "bg-blue-50 text-blue-700",
      };

    case "CANCELLED":
      return {
        label: "Annulée",
        className: "bg-red-50 text-red-700",
      };

    case "EXPIRED":
      return {
        label: "Expirée",
        className: "bg-slate-100 text-slate-600",
      };

    case "REFUNDED":
      return {
        label: "Remboursée",
        className: "bg-purple-50 text-purple-700",
      };

    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-600",
      };
  }
}

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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#061b31]">
            Évolution des réservations
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Activité des 7 derniers jours
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-[#533afd]">
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
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.22" />
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

          <polygon
            points={areaPoints}
            fill="url(#bookingGradient)"
          />

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

              payment: {
                select: {
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
        },
      },
    },
  });

  if (!user) {
    redirect("/pro/connexion");
  }

  const profile = user.profile;
  const bookings = profile?.bookings ?? [];

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

  // Chiffre d'affaires provenant uniquement des paiements réussis.
  const totalRevenue = bookings.reduce((total, booking) => {
    if (booking.payment?.status === "SUCCESS") {
      return total + booking.payment.amount;
    }

    return total;
  }, 0);

  const revenueCurrency =
    bookings.find((booking) => booking.payment?.status === "SUCCESS")
      ?.payment?.currency ?? "XOF";

  // Les cinq dernières réservations.
  const recentBookings = bookings.slice(0, 5);

  // Données du graphique.
  const lastSevenDays = getLastSevenDays();

  const chartData = lastSevenDays.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = bookings.filter((booking) => {
      return (
        booking.createdAt >= date &&
        booking.createdAt < nextDay
      );
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

      {/* SIDEBAR DESKTOP */}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">

        <Link
          href="/"
          className="flex h-20 items-center gap-2 border-b border-slate-100 px-7 text-2xl font-bold"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white">
            R
          </span>

          Reserve<span className="text-[#533afd]">X</span>
        </Link>

        <div className="flex-1 px-4 py-7">

          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
            Espace professionnel
          </p>

          <nav className="space-y-1">

            <Link
              href="/pro/dashboard"
              className="flex items-center gap-3 rounded-xl bg-[#533afd]/10 px-4 py-3 text-sm font-semibold text-[#533afd]"
            >
              <LayoutDashboard size={19} />
              Tableau de bord
            </Link>

            <Link
              href="/pro/profil"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Store size={19} />
              Mon établissement
            </Link>

            <Link
              href="/pro/prestations"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Building2 size={19} />
              Mes prestations
            </Link>

            <Link
              href="/pro/reservations"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <CalendarDays size={19} />
              Réservations
            </Link>

            <Link
              href="/pro/portefeuille"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Wallet size={19} />
              Portefeuille
            </Link>

            <Link
              href="/pro/abonnement"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Settings size={19} />
              Abonnement
            </Link>

          </nav>
        </div>

        <div className="border-t border-slate-100 p-5">

          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            <ArrowRight size={18} />
            Retour au site
          </Link>

        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}

      <div className="lg:pl-64">

        {/* HEADER */}

        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">

          <div className="flex items-center gap-3">

            <MobileMenu />

            <div>
              <p className="text-xs font-medium text-slate-400">
                Espace professionnel
              </p>

              <h1 className="mt-1 text-base font-bold sm:text-lg">
                Tableau de bord
              </h1>
            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#533afd]/10 text-[#533afd]">
              <UserRound size={20} />
            </div>

          </div>
        </header>

        {/* PAGE */}

        <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">

          {/* BIENVENUE */}

          <section className="mb-9">

            <p className="text-sm font-medium text-[#533afd]">
              {formatDate(new Date())}
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
              Bonjour, {user.name.split(" ")[0]} !
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Bienvenue dans votre espace professionnel Reserve X.
            </p>

          </section>

          {/* PROFIL NON CREE */}

          {!profile && (
            <section className="mb-9 overflow-hidden rounded-3xl bg-[#061b31] p-7 text-white sm:p-10">

              <div className="max-w-2xl">

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-indigo-200">
                  <Building2 size={15} />
                  Première étape
                </span>

                <h3 className="mt-6 text-2xl font-bold sm:text-3xl">
                  Présentez votre établissement sur Reserve X.
                </h3>

                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                  Créez votre profil professionnel pour présenter votre
                  activité, ajouter vos prestations et commencer à recevoir
                  des réservations.
                </p>

                <Link
                  href="/pro/profil"
                  className="mt-7 inline-flex items-center gap-3 rounded-xl bg-[#533afd] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#4229e8]"
                >
                  Créer mon établissement
                  <ArrowRight size={18} />
                </Link>

              </div>
            </section>
          )}

          {/* PROFIL EXISTANT */}

          {profile && (
            <section className="mb-9 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

                <div>
                  <div className="flex items-center gap-2">

                    <h3 className="text-xl font-bold">
                      {profile.businessName}
                    </h3>

                    {profile.isPublished ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <Clock size={18} className="text-amber-500" />
                    )}

                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {profile.isPublished
                      ? "Votre établissement est publié."
                      : "Votre établissement n'est pas encore publié."}
                  </p>
                </div>

                <Link
                  href="/pro/profil"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold transition hover:bg-slate-50"
                >
                  Gérer mon profil
                  <ArrowRight size={16} />
                </Link>

              </div>
            </section>
          )}

          {/* STATISTIQUES */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">

            <StatCard
              title="Prestations actives"
              value={totalServices}
              icon={<Building2 size={21} />}
              description="Services proposés"
            />

            <StatCard
              title="Réservations"
              value={totalBookings}
              icon={<CalendarDays size={21} />}
              description="Toutes les réservations"
            />

            <StatCard
              title="En attente"
              value={pendingBookings}
              icon={<Clock size={21} />}
              description="Réservations à traiter"
            />

            <StatCard
              title="Confirmées"
              value={confirmedBookings}
              icon={<CheckCircle2 size={21} />}
              description="Réservations confirmées"
            />

            <StatCard
              title="Chiffre d'affaires"
              value={formatAmount(totalRevenue, revenueCurrency)}
              icon={<Wallet size={21} />}
              description="Paiements réussis uniquement"
              highlight
            />

          </section>

          {/* GRAPHIQUE */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

            <div className="mb-6 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                <TrendingUp size={22} />
              </div>

              <div>
                <h3 className="font-bold">
                  Analyse de votre activité
                </h3>

                <p className="text-xs text-slate-400">
                  Suivez vos performances en un coup d'œil.
                </p>
              </div>

            </div>

            <BookingChart data={chartData} />

          </section>

          {/* DERNIERES RESERVATIONS */}

          <section className="mt-10">

            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <div>
                <h3 className="text-xl font-bold">
                  Dernières réservations
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Consultez les dernières demandes reçues.
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

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

              {recentBookings.length > 0 ? (

                <div className="divide-y divide-slate-100">

                  {recentBookings.map((booking) => {
                    const status = getBookingStatus(booking.status);

                    return (
                      <div
                        key={booking.id}
                        className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div className="flex min-w-0 items-start gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                            <UserRound size={20} />
                          </div>

                          <div className="min-w-0">

                            <h4 className="truncate font-bold">
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
                            <p className="text-sm font-bold">
                              {formatAmount(booking.amount, booking.currency)}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDateTime(booking.startsAt)}
                            </p>
                          </div>

                          <span
                            className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>

                        </div>

                      </div>
                    );
                  })}

                </div>

              ) : (

                <div className="px-6 py-14 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <CalendarDays size={25} />
                  </div>

                  <h4 className="mt-4 font-bold">
                    Aucune réservation pour le moment
                  </h4>

                  <p className="mt-2 text-sm text-slate-500">
                    Vos nouvelles réservations apparaîtront ici.
                  </p>

                </div>

              )}

            </div>

          </section>

          {/* ACTIONS RAPIDES */}

          <section className="mt-10">

            <div className="mb-5">
              <h3 className="text-xl font-bold">
                Actions rapides
              </h3>

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
                description="Consultez les demandes de réservation."
              />

            </div>
          </section>

          {/* INFORMATION */}

          <section className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#533afd]">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h4 className="font-bold text-[#061b31]">
                  Votre espace professionnel est prêt.
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Complétez votre profil et ajoutez vos prestations pour
                  commencer à développer votre activité sur Reserve X.
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

/* CARTE STATISTIQUE */

function StatCard({
  title,
  value,
  icon,
  description,
  highlight = false,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition hover:-translate-y-1 hover:shadow-lg sm:p-6 ${
        highlight
          ? "border-[#533afd]/20 bg-[#533afd]/5"
          : "border-slate-200 bg-white hover:shadow-slate-200/50"
      }`}
    >

      <div className="flex items-center justify-between">

        <span className="text-sm font-medium text-slate-500">
          {title}
        </span>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
          {icon}
        </div>

      </div>

      <p className="mt-5 break-words text-2xl font-bold sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>

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
      className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-[#533afd]/30 hover:shadow-lg hover:shadow-slate-200/50"
    >

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd] transition group-hover:bg-[#533afd] group-hover:text-white">
        {icon}
      </div>

      <h4 className="mt-5 font-bold">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#533afd]">
        Accéder
        <ArrowRight size={15} />
      </div>

    </Link>
  );
}