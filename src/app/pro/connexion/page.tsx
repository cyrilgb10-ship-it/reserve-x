"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  Wallet,
  QrCode,
} from "lucide-react";

export default function ConnexionProPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/pro/connexion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Identifiants incorrects.");
        setLoading(false);
        return;
      }

      router.push("/pro/dashboard");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-4 text-sm text-[#061b31] outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fc] px-5 py-8 sm:py-12">
      {/* DÉGRADÉS DÉCORATIFS */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#533afd]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[85vh] max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* PRÉSENTATION */}
        <div className="hidden lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[#061b31]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#654cff] to-[#4229e8] text-lg text-white shadow-lg shadow-[#533afd]/25">
              R
            </span>
            Reserve<span className="text-[#533afd]">X</span>
          </Link>

          <div className="mt-20 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#533afd]/10 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#533afd] shadow-sm">
              <Sparkles size={14} />
              Espace professionnel
            </div>

            <h1 className="mt-8 text-5xl font-extrabold leading-[1.15] tracking-tight text-[#061b31] xl:text-6xl">
              Retrouvez votre activité,{" "}
              <span className="text-[#533afd]">en un seul endroit.</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-8 text-slate-500">
              Connectez-vous pour gérer votre établissement, vos prestations,
              vos réservations et vos revenus en toute simplicité.
            </p>

            <div className="mt-10 space-y-5">
              {[
                {
                  icon: CalendarDays,
                  text: "Gérez vos réservations en temps réel",
                },
                {
                  icon: QrCode,
                  text: "Validez les clients avec un QR code",
                },
                {
                  icon: Wallet,
                  text: "Suivez vos revenus et vos retraits",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.text} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#533afd]/10">
                      <Icon className="h-4 w-4 text-[#533afd]" />
                    </span>
                    <span className="text-sm font-semibold text-[#26364a]">
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CARTE DÉCORATIVE */}
            <div className="mt-12 max-w-md rounded-3xl border border-white bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#533afd]/10">
                    <Building2 className="h-5 w-5 text-[#533afd]" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#061b31]">
                      Votre espace professionnel
                    </p>
                    <p className="text-xs text-slate-400">
                      Tout votre établissement réuni
                    </p>
                  </div>
                </div>

                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Actif
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["Réservations", "Simplifiées"],
                  ["Clients", "En ligne"],
                  ["Revenus", "Suivis"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-[#f7f9fc] p-3"
                  >
                    <p className="text-[10px] font-medium text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-xs font-extrabold text-[#061b31]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-16 text-xs text-slate-400">
            © 2026 Reserve X. Tous droits réservés.
          </p>
        </div>

        {/* FORMULAIRE */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-3xl font-extrabold tracking-tight text-[#061b31]"
            >
              Reserve<span className="text-[#533afd]">X</span>
            </Link>

            <p className="mt-2 text-sm text-slate-500">
              Espace professionnel
            </p>
          </div>

          <div className="rounded-[2rem] border border-white bg-white p-7 shadow-2xl shadow-slate-200/70 sm:p-9">
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#654cff]/15 to-[#533afd]/5">
                <Building2 className="h-7 w-7 text-[#533afd]" />
              </div>

              <span className="text-xs font-bold uppercase tracking-widest text-[#533afd]">
                Heureux de vous retrouver
              </span>

              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#061b31]">
                Bon retour !
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Connectez-vous à votre espace professionnel pour retrouver
                toute votre activité.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* IDENTIFIANT */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#26364a]">
                  E-mail ou téléphone
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="E-mail ou numéro de téléphone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* MOT DE PASSE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#26364a]">
                  Mot de passe
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#533afd]"
                    aria-label="Afficher ou masquer le mot de passe"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* ERREUR */}
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* CONNEXION */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#654cff] to-[#4229e8] py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#533afd]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  "Connexion en cours..."
                ) : (
                  <>
                    Se connecter
                    <ArrowRight
                      size={18}
                      className="transition group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-500">
                Vous n'avez pas encore de compte ?
              </p>

              <Link
                href="/pro/inscription"
                className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#533afd] hover:underline"
              >
                Créer un compte professionnel
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <ShieldCheck size={15} />
            <span>Votre espace professionnel Reserve X.</span>
          </div>
        </div>
      </div>
    </main>
  );
}