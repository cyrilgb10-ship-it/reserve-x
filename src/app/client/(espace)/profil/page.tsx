"use client";

import { useEffect, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

export default function ClientProfilPage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/client/profil", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Impossible de récupérer votre profil."
          );
        }

        setUser(data.user);
        setName(data.user.name);
        setEmail(data.user.email);
        setPhone(data.user.phone);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    try {
      setSaving(true);

      const response = await fetch("/api/client/profil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de modifier votre profil."
        );
      }

      setUser(data.user);
      setName(data.user.name);
      setEmail(data.user.email);
      setPhone(data.user.phone);

      setSuccess("Vos informations ont été mises à jour.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {error || "Impossible de charger votre profil."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* EN-TÊTE */}
      <div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <UserRound size={25} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Mon profil
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Gérez vos informations personnelles et vos coordonnées.
        </p>
      </div>

      {/* CARTE PROFIL */}
      <div className="rounded-2xl border border-amber-100 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-700">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              {user.name}
            </h2>

            <p className="text-sm text-zinc-500">
              Client Reserve X
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Membre depuis{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                month: "long",
                year: "numeric",
              }).format(new Date(user.createdAt))}
            </p>
          </div>
        </div>
      </div>

      {/* FORMULAIRE */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-amber-100 bg-white p-6"
      >
        <div className="mb-6">
          <h2 className="font-bold text-zinc-900">
            Informations personnelles
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Modifiez les informations associées à votre compte.
          </p>
        </div>

        <div className="space-y-5">
          {/* NOM */}
          <div>
            <label
              htmlFor="name"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-700"
            >
              <UserRound size={16} className="text-amber-500" />
              Nom complet
            </label>

            <input
              id="name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Votre nom complet"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-700"
            >
              <Mail size={16} className="text-amber-500" />
              Adresse e-mail
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="exemple@email.com"
            />
          </div>

          {/* TÉLÉPHONE */}
          <div>
            <label
              htmlFor="phone"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-700"
            >
              <Phone size={16} className="text-amber-500" />
              Numéro de téléphone
            </label>

            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
              placeholder="+228 90 00 00 00"
            />
          </div>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={19} className="shrink-0" />
            {success}
          </div>
        )}

        <div className="mt-7 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}

            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>

      {/* SÉCURITÉ */}
      <div className="flex gap-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
        <ShieldCheck
          size={23}
          className="shrink-0 text-amber-600"
        />

        <div>
          <h3 className="text-sm font-bold text-zinc-900">
            Protection de votre compte
          </h3>

          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Vos informations personnelles sont utilisées pour gérer vos
            réservations et vous contacter concernant vos tickets.
            Ne partagez jamais vos identifiants de connexion.
          </p>
        </div>
      </div>
    </div>
  );
}