import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Hotel,
  MapPin,
  Scissors,
  Search,
  ShieldCheck,
  Ticket,
  Utensils,
  CarFront,
  Camera,
  Sparkles,
  QrCode,
  CalendarCheck,
  CircleCheck,
  Zap,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import PrestationsExplorer from "@/components/PrestationsExplorer";

export const instant = false;

const categories = [
  {
    name: "Hôtels & hébergements",
    detail: "Chambres, appartements et séjours",
    icon: Hotel,
  },
  {
    name: "Restaurants",
    detail: "Restaurants, maquis et cafés",
    icon: Utensils,
  },
  {
    name: "Événements",
    detail: "Concerts, spectacles et conférences",
    icon: Ticket,
  },
  {
    name: "Beauté & bien-être",
    detail: "Coiffure, maquillage et soins",
    icon: Scissors,
  },
  {
    name: "Transport",
    detail: "Location et déplacement",
    icon: CarFront,
  },
  {
    name: "Photographie",
    detail: "Photographes et vidéastes",
    icon: Camera,
  },
];

const steps = [
  {
    number: "01",
    title: "Explorez",
    description:
      "Découvrez les professionnels et trouvez le service qui correspond à vos envies.",
    icon: Search,
  },
  {
    number: "02",
    title: "Réservez",
    description:
      "Choisissez votre prestation, votre date et renseignez vos informations.",
    icon: CalendarDays,
  },
  {
    number: "03",
    title: "Profitez",
    description:
      "Payez simplement et recevez votre confirmation avec votre QR code.",
    icon: QrCode,
  },
];

const features = [
  "Une page professionnelle personnalisée",
  "La gestion de vos services et disponibilités",
  "Le suivi de vos réservations en temps réel",
  "La validation des prestations par QR code",
  "Un portefeuille et un historique de revenus",
  "Des statistiques pour suivre votre activité",
];

const trustFeatures = [
  {
    title: "Réservations confirmées",
    description: "Une confirmation après validation du paiement.",
    icon: ShieldCheck,
  },
  {
    title: "Paiement Mobile Money",
    description: "Un paiement pratique pour vos réservations.",
    icon: CreditCard,
  },
  {
    title: "Suivi simplifié",
    description: "Retrouvez facilement vos informations.",
    icon: Clock3,
  },
];

export default async function Home() {
  // Indique à Next.js que les données doivent être récupérées à l'exécution.
  await connection();

  // Récupération des prestations actives des professionnels publiés.
  const prestations = await prisma.service.findMany({
    where: {
      isActive: true,
      profile: {
        isPublished: true,
      },
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#061b31]">
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        /* ANIMATIONS D'APPARITION */

        .rx-reveal {
          animation: rxReveal .9s cubic-bezier(.16, 1, .3, 1) both;
        }

        .rx-delay-1 { animation-delay: .12s; }
        .rx-delay-2 { animation-delay: .24s; }
        .rx-delay-3 { animation-delay: .36s; }
        .rx-delay-4 { animation-delay: .48s; }

        @keyframes rxReveal {
          from {
            opacity: 0;
            transform: translateY(35px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ANIMATIONS AU DÉFILEMENT */

        .rx-section {
          animation: rxScrollReveal linear both;
          animation-timeline: view();
          animation-range: entry 0% entry 35%;
        }

        @keyframes rxScrollReveal {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ÉLÉMENTS FLOTTANTS */

        @keyframes rxFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-14px);
          }
        }

        @keyframes rxFloatReverse {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(12px);
          }
        }

        @keyframes rxPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: .4;
            transform: scale(.8);
          }
        }

        @keyframes rxRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rxGlow {
          0%, 100% {
            opacity: .5;
          }
          50% {
            opacity: 1;
          }
        }

        .rx-float {
          animation: rxFloat 5s ease-in-out infinite;
        }

        .rx-float-slow {
          animation: rxFloatReverse 7s ease-in-out infinite;
        }

        .rx-pulse {
          animation: rxPulse 2s ease-in-out infinite;
        }

        .rx-rotate {
          animation: rxRotate 18s linear infinite;
        }

        .rx-glow {
          animation: rxGlow 4s ease-in-out infinite;
        }

        /* CADRES */

        .rx-panel,
        .rx-card,
        .rx-category {
          border-radius: 10px;
        }

        .rx-panel {
          overflow: hidden;
          transition:
            border-color .3s ease,
            background-color .3s ease;
        }

        .rx-card {
          overflow: hidden;
          transition:
            transform .4s cubic-bezier(.2,.8,.2,1),
            border-color .3s ease,
            background-color .3s ease;
        }

        .rx-card:hover {
          transform: translateY(-7px);
          border-color: #b9b9f9;
        }

        /* BOUTONS */

        .rx-button {
          border-radius: 7px;
          transition:
            transform .3s cubic-bezier(.2,.8,.2,1),
            background-color .3s ease,
            border-color .3s ease,
            box-shadow .3s ease;
        }

        .rx-button:hover {
          transform: translateY(-3px);
        }

        .rx-button:active {
          transform: translateY(-1px) scale(.98);
        }

        /* CATÉGORIES */

        .rx-category {
          transition:
            background-color .35s ease,
            border-color .35s ease,
            transform .35s cubic-bezier(.2,.8,.2,1);
        }

        .rx-category:hover {
          background-color: #f8fafd;
          border-color: #b9b9f9;
          transform: translateY(-5px);
        }

        .rx-icon {
          border-radius: 8px;
          transition:
            transform .35s ease,
            background-color .35s ease;
        }

        .rx-category:hover .rx-icon {
          transform: scale(1.1) rotate(-7deg);
          background-color: #e8e9ff;
        }

        .rx-arrow {
          transition: transform .3s ease;
        }

        .rx-category:hover .rx-arrow {
          transform: translateX(6px);
        }

        /* LIENS */

        .rx-link {
          transition: color .25s ease;
        }

        .rx-link:hover {
          color: #533afd;
        }

        /* FONDS */

        .rx-orb {
          background: radial-gradient(
            circle,
            rgba(83,58,253,.15) 0%,
            rgba(83,58,253,.05) 40%,
            rgba(83,58,253,0) 70%
          );
          animation: rxFloat 8s ease-in-out infinite;
        }

        .rx-grid {
          background-image:
            linear-gradient(rgba(83,58,253,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(83,58,253,.045) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: linear-gradient(to bottom, black, transparent 85%);
        }

        /* RECHERCHE */

        .rx-search {
          border-radius: 7px;
          transition:
            border-color .3s ease,
            background-color .3s ease;
        }

        .rx-search:focus-within {
          border-color: #b9b9f9;
          background-color: #f8fafd;
        }

        .rx-search input {
          outline: none;
        }

        /* RESPONSIVE ET ACCESSIBILITÉ */

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* NAVIGATION */}

      <header className="sticky top-0 z-50 border-b border-[#e5edf5] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[7px] bg-[#533afd] text-white transition-transform duration-300 group-hover:rotate-[-8deg]">
              <CalendarDays size={21} />
            </span>

            <span className="text-[23px] font-normal tracking-[-1.2px]">
              reserve<span className="text-[#533afd]">x</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            <a href="#decouvrir" className="rx-link text-[14px]">
              Découvrir
            </a>
            <a href="#fonctionnement" className="rx-link text-[14px]">
              Fonctionnement
            </a>
            <a href="#professionnels" className="rx-link text-[14px]">
              Professionnels
            </a>
            <a href="#tarifs" className="rx-link text-[14px]">
              Tarifs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/pro/connexion"
              className="hidden px-3 py-3 text-[14px] text-[#533afd] transition-colors hover:text-[#7389ff] sm:block"
            >
              Connexion
            </Link>

            <Link
              href="/pro/inscription"
              className="rx-button inline-flex h-11 items-center justify-center gap-2 bg-[#533afd] px-5 text-[14px] text-white hover:bg-[#7389ff]"
            >
              Rejoindre Reserve X
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="relative">
        <div className="rx-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="rx-orb pointer-events-none absolute -right-40 top-0 h-[550px] w-[550px] rounded-full" />

        <div className="relative mx-auto grid min-h-[680px] max-w-[1320px] items-center gap-12 px-6 py-24 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-28">
          <div className="relative z-10">
            <div className="rx-reveal inline-flex items-center gap-2 rounded-full border border-[#d6d9fc] bg-white/80 px-4 py-2 text-[12px] text-[#533afd]">
              <span className="relative flex h-2 w-2">
                <span className="rx-pulse absolute inline-flex h-full w-full rounded-full bg-[#533afd]" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#533afd]" />
              </span>
              LA NOUVELLE FAÇON DE RÉSERVER
            </div>

            <h1 className="rx-reveal rx-delay-1 mt-8 max-w-[760px] text-[48px] font-light leading-[1.04] tracking-[-2.5px] sm:text-[60px] lg:text-[70px]">
              Votre prochaine expérience commence{" "}
              <span className="text-[#533afd]">ici.</span>
            </h1>

            <p className="rx-reveal rx-delay-2 mt-8 max-w-[570px] text-[18px] font-light leading-[1.7] text-[#64748d]">
              Trouvez les meilleurs services autour de vous. Réservez en
              quelques instants et profitez d&apos;une expérience simple,
              rapide et sécurisée.
            </p>

            <div className="rx-reveal rx-delay-3 mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="#decouvrir"
                className="rx-button inline-flex h-13 items-center justify-center gap-3 bg-[#533afd] px-7 text-[14px] text-white hover:bg-[#7389ff]"
              >
                Explorer les services
                <ArrowRight size={17} />
              </a>

              <Link
                href="/pro/inscription"
                className="rx-button inline-flex h-13 items-center justify-center gap-3 border border-[#b9b9f9] bg-white/80 px-7 text-[14px] text-[#533afd] hover:bg-[#e8e9ff]"
              >
                Espace professionnel
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rx-reveal rx-delay-4 mt-12 flex flex-wrap gap-x-7 gap-y-4 text-[13px] text-[#64748d]">
              <span className="flex items-center gap-2">
                <CircleCheck size={16} className="text-[#533afd]" />
                Réservation facile
              </span>

              <span className="flex items-center gap-2">
                <CircleCheck size={16} className="text-[#533afd]" />
                Paiement Mobile Money
              </span>

              <span className="flex items-center gap-2">
                <CircleCheck size={16} className="text-[#533afd]" />
                QR code sécurisé
              </span>
            </div>
          </div>

          {/* APERÇU ANIMÉ */}

          <div className="relative mx-auto hidden h-[470px] w-full max-w-[490px] lg:block">
            <div className="absolute right-3 top-4 h-[390px] w-[390px] rounded-full border border-[#e5edf5]" />
            <div className="absolute right-12 top-12 h-[310px] w-[310px] rounded-full border border-[#e5edf5]" />

            <div className="rx-orb absolute right-0 top-0 h-[430px] w-[430px] rounded-full" />

            <div className="rx-float rx-panel absolute left-5 top-16 z-10 w-[310px] border border-[#e5edf5] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-[#839bc8]">
                    VOTRE RÉSERVATION
                  </p>

                  <h3 className="mt-2 text-[20px] font-light">
                    Tout est prêt.
                  </h3>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#e8e9ff] text-[#533afd]">
                  <CalendarCheck size={20} />
                </span>
              </div>

              <div className="mt-6 border-t border-[#e5edf5] pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[#e5edf5] text-[#533afd]">
                    <Hotel size={20} />
                  </div>

                  <div>
                    <p className="text-[14px]">
                      Nouvelle réservation
                    </p>
                    <p className="mt-1 text-[12px] text-[#64748d]">
                      Votre expérience vous attend
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-[7px] bg-[#f8fafd] p-4">
                <span className="text-[12px] text-[#64748d]">
                  Statut
                </span>

                <span className="flex items-center gap-2 text-[12px] text-[#533afd]">
                  <Check size={14} />
                  Confirmée
                </span>
              </div>
            </div>

            <div className="rx-float-slow rx-panel absolute bottom-16 right-0 z-20 w-[245px] border border-[#d6d9fc] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#64748d]">
                  CONFIRMATION
                </span>
                <QrCode size={20} className="text-[#533afd]" />
              </div>

              <div className="mt-5 flex items-center justify-center">
                <div className="grid grid-cols-5 gap-1 rounded-[5px] border border-[#e5edf5] p-3">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-4 w-4 rounded-[2px] ${
                        [0, 1, 3, 5, 7, 10, 12, 14, 16, 18, 20, 21, 23].includes(i)
                          ? "bg-[#061b31]"
                          : "bg-[#e8e9ff]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="mt-4 text-center text-[12px] text-[#64748d]">
                Votre QR code de réservation
              </p>
            </div>

            <div className="rx-float rx-panel absolute -left-3 bottom-10 z-30 flex items-center gap-3 border border-[#e5edf5] bg-white px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#e8e9ff] text-[#533afd]">
                <Zap size={18} />
              </span>

              <div>
                <p className="text-[13px]">Simple et rapide</p>
                <p className="mt-1 text-[11px] text-[#64748d]">
                  En quelques instants
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="border-t border-[#e5edf5]" />
      </div>

      {/* DÉCOUVERTE */}

      <section
        id="decouvrir"
        className="rx-section mx-auto max-w-[1320px] px-6 py-24 lg:px-10"
      >
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <p className="mb-5 text-[12px] tracking-[1.5px] text-[#839bc8]">
              DÉCOUVERTE
            </p>

            <h2 className="max-w-[470px] text-[40px] font-light leading-[1.08] tracking-[-1.5px] sm:text-[48px]">
              Qu&apos;avez-vous envie de réserver ?
            </h2>

            <p className="mt-5 max-w-[430px] text-[16px] leading-[1.7] text-[#64748d]">
              Explorez les catégories et trouvez le professionnel qui vous
              convient.
            </p>
          </div>

          <div className="rx-panel border border-[#e5edf5] bg-[#f8fafd] p-5 sm:p-7">
            <p className="mb-4 text-[14px] text-[#50617a]">
              Commencez votre recherche
            </p>

            <form action="/recherche" className="flex flex-col gap-3 sm:flex-row">
              <label className="rx-search flex h-12 flex-1 items-center gap-3 border border-[#e5edf5] bg-white px-4">
                <Search size={18} className="text-[#533afd]" />
                <input
                  name="q"
                  type="search"
                  placeholder="Un service, un professionnel..."
                  className="w-full bg-transparent text-[14px] placeholder:text-[#839bc8]"
                />
              </label>

              <label className="rx-search flex h-12 items-center gap-3 border border-[#e5edf5] bg-white px-4 sm:w-[160px]">
                <MapPin size={17} className="text-[#533afd]" />
                <input
                  name="city"
                  type="text"
                  placeholder="Votre ville"
                  className="w-full bg-transparent text-[14px] placeholder:text-[#839bc8]"
                />
              </label>

              <button
                type="submit"
                className="rx-button h-12 rounded-[7px] bg-[#533afd] px-6 text-[14px] text-white hover:bg-[#7389ff]"
              >
                Rechercher
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                href={`/recherche?category=${encodeURIComponent(category.name)}`}
                key={category.name}
                className="rx-category group flex items-center justify-between border-t border-[#e5edf5] py-7"
              >
                <div className="flex items-center gap-5">
                  <span className="rx-icon flex h-12 w-12 shrink-0 items-center justify-center border border-[#e5edf5] text-[#533afd]">
                    <Icon size={21} strokeWidth={1.5} />
                  </span>

                  <span>
                    <span className="block text-[16px]">
                      {category.name}
                    </span>
                    <span className="mt-1 block text-[13px] text-[#64748d]">
                      {category.detail}
                    </span>
                  </span>
                </div>

                <ChevronRight
                  size={18}
                  className="rx-arrow text-[#839bc8]"
                />
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <Link
            href="/recherche"
            className="inline-flex items-center gap-2 text-[14px] text-[#533afd] transition-all hover:gap-3 hover:text-[#7389ff]"
          >
            Explorer toutes les catégories
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* EXPLORATEUR DES PRESTATIONS */}

      <section className="rx-section mx-auto max-w-[1320px] px-6 pb-24 lg:px-10">
        <PrestationsExplorer prestations={prestations} />
      </section>

      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="border-t border-[#e5edf5]" />
      </div>

      {/* FONCTIONNEMENT */}

      <section
        id="fonctionnement"
        className="rx-section mx-auto max-w-[1320px] px-6 py-24 lg:px-10"
      >
        <div className="max-w-[700px]">
          <p className="mb-5 text-[12px] tracking-[1.5px] text-[#839bc8]">
            COMMENT ÇA MARCHE
          </p>

          <h2 className="text-[40px] font-light leading-[1.08] tracking-[-1.5px] sm:text-[48px]">
            Trois étapes. Une expérience sans complication.
          </h2>

          <p className="mt-6 text-[18px] font-light leading-[1.6] text-[#64748d]">
            De votre première recherche jusqu&apos;à la confirmation de votre
            réservation.
          </p>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="rx-card border-t border-[#e5edf5] pt-7"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#839bc8]">
                    ÉTAPE {step.number}
                  </span>

                  <span className="flex h-11 w-11 items-center justify-center rounded-[9px] bg-[#e8e9ff] text-[#533afd] transition-transform duration-300 hover:rotate-12">
                    <Icon size={21} strokeWidth={1.5} />
                  </span>
                </div>

                <h3 className="mt-8 text-[25px] font-light tracking-[-.5px]">
                  {step.title}
                </h3>

                <p className="mt-4 text-[15px] leading-[1.7] text-[#64748d]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="border-t border-[#e5edf5]" />
      </div>

      {/* PROFESSIONNELS */}

      <section
        id="professionnels"
        className="rx-section mx-auto max-w-[1320px] px-6 py-24 lg:px-10"
      >
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-5 text-[12px] tracking-[1.5px] text-[#839bc8]">
              POUR LES PROFESSIONNELS
            </p>

            <h2 className="text-[40px] font-light leading-[1.08] tracking-[-1.5px] sm:text-[48px]">
              Faites de chaque réservation une nouvelle opportunité.
            </h2>

            <p className="mt-6 max-w-[520px] text-[17px] leading-[1.7] text-[#64748d]">
              Présentez vos prestations, organisez votre calendrier et
              retrouvez toutes vos réservations depuis un seul espace.
            </p>

            <Link
              href="/pro/inscription"
              className="rx-button mt-9 inline-flex h-12 items-center gap-3 bg-[#533afd] px-6 text-[14px] text-white hover:bg-[#7389ff]"
            >
              Créer mon espace professionnel
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="rx-card border border-[#e5edf5] p-7 sm:p-10">
            <div className="mb-8 flex items-center gap-3 border-b border-[#e5edf5] pb-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-[9px] bg-[#e8e9ff] text-[#533afd]">
                <Sparkles size={21} />
              </span>

              <div>
                <p className="text-[16px]">
                  Votre espace professionnel
                </p>
                <p className="mt-1 text-[12px] text-[#64748d]">
                  Tous vos outils, au même endroit
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <Check
                    size={17}
                    className="mt-0.5 shrink-0 text-[#533afd]"
                  />

                  <p className="text-[14px] leading-[1.5] text-[#50617a]">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="border-t border-[#e5edf5]" />
      </div>

      {/* TARIFS */}

      <section
        id="tarifs"
        className="rx-section mx-auto max-w-[1320px] px-6 py-24 lg:px-10"
      >
        <div className="max-w-[700px]">
          <p className="mb-5 text-[12px] tracking-[1.5px] text-[#839bc8]">
            ABONNEMENTS
          </p>

          <h2 className="text-[40px] font-light leading-[1.08] tracking-[-1.5px] sm:text-[48px]">
            La bonne formule pour votre activité.
          </h2>

          <p className="mt-6 text-[17px] leading-[1.6] text-[#64748d]">
            Commencez simplement et faites évoluer votre présence selon vos
            besoins.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* BASIC */}

          <div className="rx-card border border-[#e5edf5] p-8 sm:p-10">
            <p className="text-[13px] text-[#64748d]">
              ESSENTIEL
            </p>

            <h3 className="mt-4 text-[28px] font-light">
              BASIC
            </h3>

            <div className="mt-7 flex items-end gap-2">
              <span className="text-[48px] font-light tracking-[-1.8px]">
                1 499
              </span>

              <span className="mb-2 text-[14px] text-[#64748d]">
                FCFA / mois
              </span>
            </div>

            <div className="my-8 border-t border-[#e5edf5]" />

            <p className="text-[14px] leading-[1.7] text-[#64748d]">
              Pour commencer à développer votre présence et recevoir vos
              premières réservations.
            </p>

            <Link
              href="/pro/inscription?plan=BASIC"
              className="rx-button mt-9 flex h-12 items-center justify-center gap-2 border border-[#b9b9f9] text-[14px] text-[#533afd] hover:bg-[#e8e9ff]"
            >
              Choisir BASIC
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* PREMIUM */}

          <div className="rx-card relative border border-[#b9b9f9] bg-[#f8fafd] p-8 sm:p-10">
            <span className="absolute right-8 top-8 rounded-full border border-[#d6d9fc] bg-[#e8e9ff] px-3 py-1 text-[11px] text-[#533afd]">
              PREMIUM
            </span>

            <p className="text-[13px] text-[#533afd]">
              POUR ALLER PLUS LOIN
            </p>

            <h3 className="mt-4 text-[28px] font-light">
              PREMIUM
            </h3>

            <div className="mt-7 flex items-end gap-2">
              <span className="text-[48px] font-light tracking-[-1.8px]">
                3 999
              </span>

              <span className="mb-2 text-[14px] text-[#64748d]">
                FCFA / mois
              </span>
            </div>

            <div className="my-8 border-t border-[#e5edf5]" />

            <p className="text-[14px] leading-[1.7] text-[#64748d]">
              Pour les professionnels qui souhaitent profiter d&apos;une
              expérience plus complète.
            </p>

            <Link
              href="/pro/inscription?plan=PREMIUM"
              className="rx-button mt-9 flex h-12 items-center justify-center gap-2 bg-[#533afd] text-[14px] text-white hover:bg-[#7389ff]"
            >
              Choisir PREMIUM
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* AVANTAGES */}

      <section className="rx-section border-y border-[#e5edf5] bg-[#f8fafd]">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-16 md:grid-cols-3 lg:px-10">
          {trustFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group flex items-start gap-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[9px] border border-[#e5edf5] bg-white text-[#533afd] transition-all duration-300 group-hover:rotate-[-6deg] group-hover:border-[#b9b9f9]">
                  <Icon size={22} strokeWidth={1.5} />
                </span>

                <div>
                  <h3 className="text-[16px]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-[13px] leading-[1.6] text-[#64748d]">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BANDEAU FINAL */}

      <section className="relative overflow-hidden border-b border-[#e5edf5] bg-[#f8fafd]">
        <div className="rx-orb pointer-events-none absolute -right-24 -top-40 h-[400px] w-[400px] rounded-full" />

        <div className="relative mx-auto flex max-w-[1320px] flex-col justify-between gap-8 px-6 py-20 md:flex-row md:items-center lg:px-10">
          <div>
            <p className="mb-4 text-[12px] tracking-[1.5px] text-[#839bc8]">
              C&apos;EST À VOUS DE JOUER
            </p>

            <h2 className="max-w-[650px] text-[36px] font-light leading-[1.1] tracking-[-1.2px] sm:text-[44px]">
              Prêt à découvrir une nouvelle façon de réserver ?
            </h2>

            <p className="mt-4 text-[15px] text-[#64748d]">
              Rejoignez Reserve X et simplifiez vos prochaines expériences.
            </p>
          </div>

          <Link
            href="/pro/inscription"
            className="rx-button inline-flex h-12 shrink-0 items-center justify-center gap-3 bg-[#533afd] px-7 text-[14px] text-white hover:bg-[#7389ff]"
          >
            Commencer maintenant
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-16 lg:px-10">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#533afd] text-white">
                  <CalendarDays size={19} />
                </span>

                <span className="text-[22px] tracking-[-1px]">
                  reserve<span className="text-[#533afd]">x</span>
                </span>
              </Link>

              <p className="mt-5 max-w-[280px] text-[14px] leading-[1.7] text-[#64748d]">
                La plateforme qui rapproche les clients des professionnels
                et simplifie chaque réservation.
              </p>
            </div>

            <div>
              <h4 className="mb-5 text-[13px]">
                Découvrir
              </h4>

              <div className="space-y-4 text-[13px] text-[#64748d]">
                <a href="#decouvrir" className="block rx-link">
                  Catégories
                </a>
                <a href="#fonctionnement" className="block rx-link">
                  Comment ça marche
                </a>
                <a href="#tarifs" className="block rx-link">
                  Tarifs
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-5 text-[13px]">
                Professionnels
              </h4>

              <div className="space-y-4 text-[13px] text-[#64748d]">
                <Link href="/pro/inscription" className="block rx-link">
                  Créer un compte
                </Link>
                <a href="#professionnels" className="block rx-link">
                  Fonctionnalités
                </a>
                <Link href="/pro/connexion" className="block rx-link">
                  Mon espace
                </Link>
              </div>
            </div>

            <div>
              <h4 className="mb-5 text-[13px]">
                Votre compte
              </h4>

              <div className="space-y-4 text-[13px] text-[#64748d]">
                <Link href="/pro/connexion" className="block rx-link">
                  Connexion
                </Link>
                <Link href="/pro/inscription" className="block rx-link">
                  Inscription
                </Link>
                <Link href="/recherche" className="block rx-link">
                  Rechercher un service
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col justify-between gap-4 border-t border-[#e5edf5] pt-7 text-[12px] text-[#839bc8] sm:flex-row">
            <p>
              © 2026 Reserve X. Tous droits réservés.
            </p>

            <p>
              Réserver simplement. Profiter pleinement.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}