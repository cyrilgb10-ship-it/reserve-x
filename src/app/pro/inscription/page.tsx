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
    "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10";

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-10">
      <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-12 lg:grid-cols-2">

        {/* PRESENTATION */}
        <div className="hidden lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#061b31]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white">
              R
            </span>
            Reserve<span className="text-[#533afd]">X</span>
          </Link>

          <div className="mt-16">
            <span className="rounded-full bg-[#533afd]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#533afd]">
              Espace professionnel
            </span>

            <h1 className="mt-7 max-w-lg text-5xl font-bold leading-tight tracking-tight text-[#061b31]">
              Développez votre activité avec Reserve X.
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-slate-500">
              Présentez vos services, recevez des réservations et gérez votre
              activité depuis un seul espace.
            </p>

            <div className="mt-10 space-y-5">
              {[
                "Présentez votre établissement en ligne",
                "Recevez des réservations facilement",
                "Suivez vos revenus et votre activité",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#533afd]" />
                  <span className="text-sm font-medium text-slate-700">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-20 text-xs text-slate-400">
            © 2026 Reserve X. Tous droits réservés.
          </p>
        </div>

        {/* FORMULAIRE */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Link
              href="/"
              className="text-3xl font-bold tracking-tight text-[#061b31]"
            >
              Reserve<span className="text-[#533afd]">X</span>
            </Link>
            <p className="mt-2 text-sm text-slate-500">
              Espace professionnel
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#533afd]/10">
                <Building2 className="h-6 w-6 text-[#533afd]" />
              </div>

              <h2 className="text-2xl font-bold text-[#061b31]">
                Créer un compte
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Rejoignez Reserve X et commencez à développer votre activité.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* NOM */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                <label className="mb-2 block text-sm font-semibold text-slate-700">
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

              {/* TELEPHONE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#533afd] py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  "Création du compte..."
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight size={18} />
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
                className="mt-2 inline-block text-sm font-bold text-[#533afd] hover:underline"
              >
                Se connecter
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            En créant un compte, vous acceptez les conditions d'utilisation
            de Reserve X.
          </p>
        </div>
      </div>
    </main>
  );
}