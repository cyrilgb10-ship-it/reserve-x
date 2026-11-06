import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CalendarCheck,
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
  UserRound,
  Smartphone,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import PrestationsExplorer from "@/components/PrestationsExplorer";

export const instant = false;

const categories = [
  {
    name: "Hôtels & hébergements",
    detail: "Chambres, appartements et séjours",
    value: "HOTEL",
    icon: Hotel,
  },
  {
    name: "Restaurants",
    detail: "Restaurants, maquis et cafés",
    value: "RESTAURANT",
    icon: Utensils,
  },
  {
    name: "Événements",
    detail: "Concerts, spectacles et conférences",
    value: "EVENT",
    icon: Ticket,
  },
  {
    name: "Beauté & bien-être",
    detail: "Coiffure, maquillage et soins",
    value: "BEAUTY",
    icon: Scissors,
  },
  {
    name: "Transport",
    detail: "Location et déplacement",
    value: "TRANSPORT",
    icon: CarFront,
  },
  {
    name: "Photographie",
    detail: "Photographes et vidéastes",
    value: "PHOTOGRAPHY",
    icon: Camera,
  },
];

const steps = [
  {
    number: "01",
    title: "Découvrez",
    description:
      "Explorez les prestations et trouvez le professionnel qui correspond à vos besoins.",
    icon: Search,
  },
  {
    number: "02",
    title: "Réservez",
    description:
      "Choisissez votre prestation, votre date et effectuez votre réservation.",
    icon: CalendarDays,
  },
  {
    number: "03",
    title: "Profitez",
    description:
      "Recevez votre confirmation et votre QR code pour profiter de votre prestation.",
    icon: QrCode,
  },
];

const professionalFeatures = [
  "Une page professionnelle personnalisée",
  "La gestion de vos services et disponibilités",
  "Le suivi de vos réservations",
  "La validation des prestations par QR code",
  "Un portefeuille et un historique de revenus",
  "Des statistiques pour suivre votre activité",
];

const trustFeatures = [
  {
    title: "Réservation simplifiée",
    description:
      "Trouvez et réservez vos prestations sans démarches compliquées.",
    icon: CalendarCheck,
  },
  {
    title: "Paiement Mobile Money",
    description:
      "Payez vos réservations simplement avec les moyens disponibles.",
    icon: CreditCard,
  },
  {
    title: "Confirmation par QR code",
    description:
      "Retrouvez votre billet et présentez votre QR code au professionnel.",
    icon: ShieldCheck,
  },
];

export default async function Home() {
  await connection();

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
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-[#061b31]">
      {/* NAVIGATION */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white shadow-lg shadow-[#533afd]/20">
              <CalendarDays size={20} />
            </span>

            <span className="text-2xl font-extrabold tracking-tight text-[#061b31]">
              Reserve<span className="text-[#533afd]">X</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <a
              href="#decouvrir"
              className="text-sm font-medium text-slate-600 transition hover:text-[#533afd]"
            >
              Découvrir
            </a>

            <a
              href="#fonctionnement"
              className="text-sm font-medium text-slate-600 transition hover:text-[#533afd]"
            >
              Comment ça marche
            </a>

            <a
              href="#professionnels"
              className="text-sm font-medium text-slate-600 transition hover:text-[#533afd]"
            >
              Professionnels
            </a>

            <a
              href="#tarifs"
              className="text-sm font-medium text-slate-600 transition hover:text-[#533afd]"
            >
              Tarifs
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden bg-[#061b31] text-white">
        {/* DÉCORATION */}

        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#533afd]/30 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:45px_45px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 md:py-28 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
          {/* TEXTE */}

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-violet-200">
              <Sparkles size={15} />
              VOTRE NOUVELLE FAÇON DE RÉSERVER
            </div>

            <h1 className="mt-8 max-w-2xl text-5xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-6xl lg:text-[68px]">
              Les bonnes expériences commencent{" "}
              <span className="text-[#8e80ff]">ici.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 md:text-lg">
              Restaurants, hôtels, événements, beauté et bien plus encore.
              Découvrez les professionnels, réservez vos prestations et
              profitez de chaque instant.
            </p>

            {/* ACCÈS CLIENTS ET PROFESSIONNELS */}

            <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/client/inscription"
                className="flex items-center justify-center gap-3 rounded-xl bg-[#533afd] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:-translate-y-1 hover:bg-[#4229e8]"
              >
                <UserRound size={18} />
                Créer un compte client
                <ArrowUpRight size={17} />
              </Link>

              <Link
                href="/client/connexion"
                className="flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                <UserRound size={18} />
                Connexion client
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/pro/inscription"
                className="flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                <CalendarDays size={18} />
                Je suis professionnel
                <ArrowUpRight size={17} />
              </Link>

              <Link
                href="/pro/connexion"
                className="flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                <CalendarDays size={18} />
                Connexion professionnel
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <Check size={16} className="text-[#9488ff]" />
                Réservation facile
              </span>

              <span className="flex items-center gap-2">
                <Check size={16} className="text-[#9488ff]" />
                Paiement Mobile Money
              </span>

              <span className="flex items-center gap-2">
                <Check size={16} className="text-[#9488ff]" />
                Billets QR
              </span>
            </div>
          </div>

          {/* ILLUSTRATION DU PARCOURS CLIENT */}

          <div className="relative mx-auto w-full max-w-[510px]">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#533afd]/40 blur-3xl" />

            <div className="relative rounded-[32px] border border-white/20 bg-white p-5 text-[#061b31] shadow-2xl shadow-black/20 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Votre espace
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-[#061b31]">
                    Vos réservations
                  </h3>
                </div>

                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                  <CalendarCheck size={22} />
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-[#f7f9fc] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#533afd]">
                    UNE RÉSERVATION EN QUELQUES CLICS
                  </span>

                  <Sparkles size={17} className="text-[#533afd]" />
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#533afd] shadow-sm">
                    <Hotel size={25} />
                  </span>

                  <div>
                    <p className="font-bold text-[#061b31]">
                      Choisissez votre prestation
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Trouvez ce qui vous correspond.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#533afd] shadow-sm">
                    <CreditCard size={25} />
                  </span>

                  <div>
                    <p className="font-bold text-[#061b31]">
                      Effectuez votre paiement
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Finalisez votre réservation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600">
                    <Check size={20} />
                  </span>

                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      Réservation confirmée
                    </p>

                    <p className="mt-1 text-xs text-emerald-700">
                      Votre confirmation est prête.
                    </p>
                  </div>
                </div>

                <QrCode size={28} className="text-emerald-700" />
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#061b31] p-4 text-white">
                <Smartphone size={21} className="shrink-0 text-violet-300" />

                <p className="text-xs leading-5 text-white/80">
                  Retrouvez vos réservations et vos billets dans votre espace
                  client.
                </p>
              </div>
            </div>

            <div className="absolute -bottom-7 -left-5 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-[#061b31] shadow-xl sm:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                <ShieldCheck size={22} />
              </span>

              <div>
                <p className="text-sm font-bold">Simple et pratique</p>

                <p className="mt-1 text-xs text-slate-500">
                  Réservez en toute simplicité
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FONCTIONNEMENT */}

      <section
        id="fonctionnement"
        className="bg-[#f7f9fc] py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#533afd]">
              Comment ça marche ?
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#061b31] md:text-4xl">
              Trois étapes pour profiter pleinement.
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-500">
              De votre recherche jusqu'à votre réservation, tout est pensé
              pour vous simplifier la vie.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#533afd]/20 hover:shadow-xl hover:shadow-slate-200/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold tracking-widest text-[#533afd]">
                      {step.number}
                    </span>

                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                      <Icon size={23} />
                    </span>
                  </div>

                  <h3 className="mt-9 text-2xl font-extrabold text-[#061b31]">
                    {step.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-slate-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROFESSIONNELS */}

      <section
        id="professionnels"
        className="bg-white py-20 md:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          {/* TEXTE */}

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#533afd]">
              Pour les professionnels
            </span>

            <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-[#061b31] md:text-5xl">
              Faites grandir votre activité avec{" "}
              <span className="text-[#533afd]">Reserve X.</span>
            </h2>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-500">
              Offrez une meilleure visibilité à votre établissement,
              recevez des réservations et gérez votre activité depuis
              un espace professionnel.
            </p>

            <div className="mt-8 space-y-4">
              {professionalFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#533afd]/10 text-[#533afd]">
                    <Check size={14} />
                  </span>

                  <span className="text-sm font-medium text-slate-700">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/pro/inscription"
              className="mt-10 inline-flex items-center gap-3 rounded-xl bg-[#533afd] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:-translate-y-1 hover:bg-[#4229e8]"
            >
              Créer mon espace professionnel
              <ArrowUpRight size={18} />
            </Link>
          </div>

          {/* ILLUSTRATION PROFESSIONNELLE */}

          <div className="relative rounded-[32px] border border-slate-200 bg-[#f7f9fc] p-6 md:p-10">
            <div className="absolute -right-5 -top-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[#533afd] shadow-xl">
              <Sparkles size={30} />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-400">
                    ESPACE PROFESSIONNEL
                  </p>

                  <h3 className="mt-1 text-xl font-extrabold text-[#061b31]">
                    Votre activité
                  </h3>
                </div>

                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                  <CalendarDays size={22} />
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-[#f7f9fc] p-4">
                  <CalendarCheck size={21} className="text-[#533afd]" />

                  <p className="mt-4 text-xs text-slate-500">
                    Réservations
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#061b31]">
                    Suivi centralisé
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#f7f9fc] p-4">
                  <Clock3 size={21} className="text-[#533afd]" />

                  <p className="mt-4 text-xs text-slate-500">
                    Disponibilités
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#061b31]">
                    Votre calendrier
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#f7f9fc] p-4">
                  <QrCode size={21} className="text-[#533afd]" />

                  <p className="mt-4 text-xs text-slate-500">
                    QR code
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#061b31]">
                    Validation des clients
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#f7f9fc] p-4">
                  <CreditCard size={21} className="text-[#533afd]" />

                  <p className="mt-4 text-xs text-slate-500">
                    Revenus
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#061b31]">
                    Suivi du portefeuille
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#061b31] p-4 text-white">
                <ShieldCheck size={22} className="shrink-0 text-violet-300" />

                <p className="text-xs leading-5 text-white/80">
                  Votre activité, vos réservations et vos outils réunis
                  dans un seul espace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TARIFS */}

      <section
        id="tarifs"
        className="bg-[#f7f9fc] py-20 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#533afd]">
              Nos tarifs
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#061b31] md:text-4xl">
              Une formule simple et transparente.
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-500">
              Tout ce dont vous avez besoin pour développer votre activité.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            {/* EN-TÊTE TARIF */}

            <div className="bg-[#061b31] px-8 py-7 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-violet-200">
                  Abonnement professionnel
                </span>

                <span className="rounded-full bg-[#533afd] px-3 py-2 text-xs font-bold text-white">
                  30 jours offerts
                </span>
              </div>

              <h3 className="mt-5 text-2xl font-extrabold">
                Développez votre activité.
              </h3>

              <p className="mt-2 text-sm text-slate-300">
                Tous les outils pour gérer votre présence sur Reserve X.
              </p>
            </div>

            {/* DÉTAIL DU TARIF */}

            <div className="p-8 md:p-10">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-[#061b31]">
                  2 000
                </span>

                <span className="mb-2 text-sm font-semibold text-slate-500">
                  FCFA / mois
                </span>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Commencez gratuitement pendant 30 jours, puis profitez
                de tous les outils pour 2 000 FCFA par mois.
              </p>

              <div className="my-7 border-t border-slate-100" />

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Page professionnelle personnalisée",
                  "Gestion des prestations",
                  "Gestion des réservations",
                  "Validation par QR code",
                  "Portefeuille et revenus",
                  "Statistiques d'activité",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check size={17} className="mt-0.5 shrink-0 text-[#533afd]" />

                    <span className="text-sm text-slate-600">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/pro/inscription"
                className="mt-9 flex w-full items-center justify-center gap-2 rounded-xl bg-[#533afd] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:bg-[#4229e8]"
              >
                Profiter de mes 30 jours gratuits
                <ArrowRight size={17} />
              </Link>

              <p className="mt-4 text-center text-xs font-medium text-slate-400">
                Sans commission sur vos réservations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AVANTAGES */}

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-3 lg:px-8">
          {trustFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                  <Icon size={22} />
                </span>

                <div>
                  <h3 className="text-sm font-extrabold text-[#061b31]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BANDEAU FINAL */}

      <section className="bg-white px-5 py-16 md:py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#061b31] px-7 py-14 text-white md:px-14 md:py-20">
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#533afd]/40 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-10 md:flex-row md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-violet-300">
                Votre prochaine expérience
              </span>

              <h2 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Et si votre prochaine réservation commençait ici ?
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
                Explorez les services disponibles et découvrez une nouvelle
                manière de réserver.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* MARQUE */}

            <div>
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white">
                  <CalendarDays size={20} />
                </span>

                <span className="text-2xl font-extrabold tracking-tight text-[#061b31]">
                  Reserve<span className="text-[#533afd]">X</span>
                </span>
              </Link>

              <p className="mt-5 max-w-xs text-sm leading-7 text-slate-500">
                La plateforme qui rapproche les clients des professionnels
                et simplifie chaque réservation.
              </p>
            </div>

            {/* CLIENTS */}

            <div>
              <h4 className="mb-5 text-sm font-extrabold text-[#061b31]">
                Espace client
              </h4>

              <div className="space-y-4 text-sm text-slate-500">
                <Link
                  href="/client/inscription"
                  className="block transition hover:text-[#533afd]"
                >
                  Créer un compte
                </Link>

                <Link
                  href="/client/connexion"
                  className="block transition hover:text-[#533afd]"
                >
                  Se connecter
                </Link>
              </div>
            </div>

            {/* PROFESSIONNELS */}

            <div>
              <h4 className="mb-5 text-sm font-extrabold text-[#061b31]">
                Professionnels
              </h4>

              <div className="space-y-4 text-sm text-slate-500">
                <Link
                  href="/pro/inscription"
                  className="block transition hover:text-[#533afd]"
                >
                  Rejoindre Reserve X
                </Link>

                <Link
                  href="/pro/connexion"
                  className="block transition hover:text-[#533afd]"
                >
                  Connexion professionnelle
                </Link>

                <a
                  href="#tarifs"
                  className="block transition hover:text-[#533afd]"
                >
                  Nos tarifs
                </a>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col justify-between gap-4 border-t border-slate-100 pt-7 text-xs text-slate-400 sm:flex-row">
            <p>© 2026 Reserve X. Tous droits réservés.</p>

            <p>Réserver simplement. Profiter pleinement.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}