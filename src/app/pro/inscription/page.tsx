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
  Phone,
  User,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function InscriptionProPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/pro/inscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue.");
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

  const benefits = [
    "Présentez votre établissement en ligne",
    "Recevez des réservations facilement",
    "Gérez vos disponibilités simplement",
    "Suivez vos revenus et votre activité",
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fc] px-5 py-8 sm:py-12">
      {/* DÉCORATION */}
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
              Faites grandir votre activité avec{" "}
              <span className="text-[#533afd]">Reserve X.</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-8 text-slate-500">
              Développez votre visibilité, attirez de nouveaux clients et
              simplifiez la gestion de vos réservations depuis un espace unique.
            </p>

            <div className="mt-10 space-y-5">
              {benefits.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#533afd]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#533afd]" />
                  </span>
                  <span className="text-sm font-semibold text-[#26364a]">
                    {item}
                  </span>
                </div>
              ))}
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
                      Votre établissement
                    </p>
                    <p className="text-xs text-slate-400">
                      Votre vitrine professionnelle
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  En ligne
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["Visibilité", "24h/24"],
                  ["Réservations", "En ligne"],
                  ["Gestion", "Simple"],
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
                Rejoignez-nous
              </span>

              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#061b31]">
                Créer un compte
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Créez votre espace professionnel et commencez à développer
                votre activité.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* NOM */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#26364a]">
                  Nom complet
                </label>

                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Votre nom complet"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#26364a]">
                  Adresse e-mail
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="exemple@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* TÉLÉPHONE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#26364a]">
                  Numéro de téléphone
                </label>

                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+228 90 00 00 00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="8 caractères minimum"
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

              {/* CONFIRMATION */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#26364a]">
                  Confirmer le mot de passe
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Répétez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#533afd]"
                    aria-label="Afficher ou masquer la confirmation"
                  >
                    {showConfirmPassword ? (
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

              {/* BOUTON */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#654cff] to-[#4229e8] py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#533afd]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  "Création du compte..."
                ) : (
                  <>
                    Créer mon compte
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
                Vous avez déjà un compte ?
              </p>

              <Link
                href="/pro/connexion"
                className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#533afd] hover:underline"
              >
                Se connecter
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <ShieldCheck size={15} />
            <span>
              Vos informations sont protégées par Reserve X.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}