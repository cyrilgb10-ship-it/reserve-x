"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  ShieldCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function AdminConnexionPage() {
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
      const response = await fetch("/api/admin/connexion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Identifiants incorrects.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(
        "Impossible de contacter le serveur. Vérifiez votre connexion."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafd] px-5 py-12 text-[#061b31]">
      <div className="w-full max-w-[440px]">

        {/* IDENTITÉ */}
        <div className="mb-10 text-center">
          <a href="/" className="text-3xl font-extrabold tracking-tight">
            Reserve<span className="text-[#533afd]">X</span>
          </a>

          <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-lg border border-[#e5edf5] bg-white">
            <ShieldCheck className="h-7 w-7 text-[#533afd]" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Administration
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Connectez-vous pour accéder à votre espace administrateur.
          </p>
        </div>

        {/* FORMULAIRE */}
        <div className="border border-[#e5edf5] bg-white p-7 sm:p-9">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* EMAIL */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-sm font-semibold"
              >
                Adresse email
              </label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="identifier"
                  type="email"
                  autoComplete="username"
                  placeholder="Votre adresse email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  disabled={loading}
                  className="h-12 w-full border border-[#e5edf5] bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-300 focus:border-[#533afd] disabled:opacity-60"
                />
              </div>
            </div>

            {/* MOT DE PASSE */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
              >
                Mot de passe
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                  className="h-12 w-full border border-[#e5edf5] bg-white pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-300 focus:border-[#533afd] disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#533afd]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ERREUR */}
            {error && (
              <div
                role="alert"
                className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {/* BOUTON */}
            <button
              type="submit"
              disabled={loading || !identifier.trim() || !password}
              className="flex h-12 w-full items-center justify-center gap-2 bg-[#533afd] px-5 text-sm font-semibold text-white transition hover:bg-[#4330d5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* SÉCURITÉ */}
          <div className="mt-7 border-t border-[#e5edf5] pt-5">
            <p className="text-center text-xs leading-5 text-slate-400">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
              Accès réservé aux administrateurs de Reserve X.
            </p>
          </div>
        </div>

        {/* RETOUR */}
        <div className="mt-7 text-center">
          <a
            href="/"
            className="text-sm font-medium text-slate-400 transition hover:text-[#533afd]"
          >
            Retour à l'accueil
          </a>
        </div>

      </div>
    </main>
  );
}