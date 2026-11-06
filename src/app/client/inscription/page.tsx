"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  UserRound,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  User,
  CheckCircle2,
} from "lucide-react";

export default function InscriptionClientPage() {
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

  const [loginHref, setLoginHref] = useState("/client/connexion");

  // Récupération sécurisée des paramètres de l'URL côté navigateur.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.toString();

    setLoginHref(
      query
        ? `/client/connexion?${query}`
        : "/client/connexion",
    );
  }, []);

  function getSafeRedirect(): string {
    const redirectTo = new URLSearchParams(
      window.location.search,
    ).get("redirect");

    if (
      !redirectTo ||
      !redirectTo.startsWith("/") ||
      redirectTo.startsWith("//") ||
      redirectTo.startsWith("/\\")
    ) {
      return "/client/dashboard";
    }

    try {
      const url = new URL(redirectTo, window.location.origin);

      if (url.origin !== window.location.origin) {
        return "/client/dashboard";
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "/client/dashboard";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

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
      const response = await fetch("/api/client/inscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      const destination = getSafeRedirect();

      router.replace(destination);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10";

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-8 text-[#061b31] sm:py-10">
      <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-12 lg:grid-cols-2">

        {/* PRÉSENTATION */}

        <div className="hidden lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#061b31]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd] text-white shadow-lg shadow-[#533afd]/20">
              R
            </span>
            Reserve<span className="text-[#533afd]">X</span>
          </Link>

          <div className="mt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#533afd]/10 bg-[#533afd]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#533afd]">
              <UserRound size={15} />
              Espace client
            </span>

            <h1 className="mt-7 max-w-lg text-5xl font-bold leading-tight tracking-tight text-[#061b31]">
              Réservez simplement. Profitez pleinement.
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-slate-500">
              Créez votre compte pour découvrir des prestations, réserver
              vos services préférés et retrouver facilement vos billets.
            </p>

            <div className="mt-10 space-y-5">
              {[
                "Découvrez des professionnels près de chez vous",
                "Réservez vos prestations en quelques clics",
                "Retrouvez vos réservations et billets QR",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#533afd]/10">
                    <CheckCircle2 className="h-5 w-5 text-[#533afd]" />
                  </div>

                  <span className="text-sm font-semibold text-slate-600">
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

          {/* LOGO MOBILE */}

          <div className="mb-8 text-center lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-3xl font-bold tracking-tight text-[#061b31]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-lg text-white">
                R
              </span>
              Reserve<span className="text-[#533afd]">X</span>
            </Link>

            <p className="mt-3 text-sm font-medium text-slate-500">
              Espace client
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

            {/* BANDE SUPÉRIEURE */}

            <div className="h-1.5 bg-gradient-to-r from-[#533afd] via-[#7465ff] to-[#061b31]" />

            <div className="p-7 sm:p-9">
              <div className="mb-8">
                <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#533afd]/10">
                  <UserRound className="h-6 w-6 text-[#533afd]" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-[#061b31]">
                  Créer mon compte
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Rejoignez Reserve X et simplifiez vos réservations.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* NOM */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
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
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
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
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
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
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-[#533afd]"
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
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-[#533afd]"
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
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
                  >
                    <span className="shrink-0">!</span>
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

              {/* CONNEXION */}

              <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">
                  Vous avez déjà un compte ?
                </p>

                <Link
                  href={loginHref}
                  className="mt-2 inline-block text-sm font-bold text-[#533afd] transition hover:text-[#4229e8] hover:underline"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            En créant un compte, vous acceptez les conditions d'utilisation
            de Reserve X.
          </p>
        </div>
      </div>
    </main>
  );
}