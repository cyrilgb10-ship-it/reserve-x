"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Save,
  Loader2,
  ArrowLeft,
  Clock,
  Globe,
  CheckCircle2,
  Eye,
} from "lucide-react";

const categories = [
  { value: "HOTEL", label: "Hôtel" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "EVENT", label: "Événementiel" },
  { value: "VENUE", label: "Salle et espace événementiel" },
  { value: "PHOTOGRAPHY", label: "Photographie" },
  { value: "BEAUTY", label: "Beauté et bien-être" },
  { value: "VEHICLE", label: "Location de véhicules" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MECHANIC", label: "Mécanique" },
  { value: "TECHNICIAN", label: "Technicien" },
  { value: "ARTISAN", label: "Artisanat" },
  { value: "OTHER", label: "Autre" },
];

const days = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

type ProfileForm = {
  businessName: string;
  category: string;
  description: string;
  address: string;
  city: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
};

type BusinessHour = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

const initialForm: ProfileForm = {
  businessName: "",
  category: "",
  description: "",
  address: "",
  city: "",
  country: "Togo",
  contactEmail: "",
  contactPhone: "",
};

function createInitialBusinessHours(): BusinessHour[] {
  return days.map((day) => ({
    dayOfWeek: day.value,
    isOpen: day.value !== 7,
    openTime: "08:00",
    closeTime: "18:00",
  }));
}

export default function ProfilPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>(initialForm);

  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
    createInitialBusinessHours()
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [isPublished, setIsPublished] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // CHARGEMENT DU PROFIL
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/pro/profil", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          router.push("/pro/connexion");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.error || "Impossible de charger le profil."
          );
        }

        if (data.profile) {
          const profile = data.profile;

          setHasProfile(true);
          setIsPublished(Boolean(profile.isPublished));

          setForm({
            businessName: profile.businessName || "",
            category: profile.category || "",
            description: profile.description || "",
            address: profile.address || "",
            city: profile.city || "",
            country: profile.country || "Togo",
            contactEmail: profile.contactEmail || "",
            contactPhone: profile.contactPhone || "",
          });

          if (
            Array.isArray(profile.businessHours) &&
            profile.businessHours.length > 0
          ) {
            const savedHours = profile.businessHours as BusinessHour[];

            const completeHours = days.map((day) => {
              const saved = savedHours.find(
                (hour) => hour.dayOfWeek === day.value
              );

              return (
                saved || {
                  dayOfWeek: day.value,
                  isOpen: day.value !== 7,
                  openTime: "08:00",
                  closeTime: "18:00",
                }
              );
            });

            setBusinessHours(completeHours);
          }
        }
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
  }, [router]);

  // MODIFICATION DES CHAMPS
  function updateField(field: keyof ProfileForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // MODIFICATION DES HORAIRES
  function updateBusinessHour(
    dayOfWeek: number,
    field: keyof BusinessHour,
    value: string | boolean
  ) {
    setBusinessHours((previous) =>
      previous.map((hour) =>
        hour.dayOfWeek === dayOfWeek
          ? { ...hour, [field]: value }
          : hour
      )
    );
  }

  // VÉRIFICATION DES HORAIRES
  function validateBusinessHours() {
    for (const hour of businessHours) {
      if (hour.isOpen && hour.closeTime <= hour.openTime) {
        const dayLabel = days.find(
          (day) => day.value === hour.dayOfWeek
        )?.label;

        setError(
          `Vérifiez les horaires du ${dayLabel} : l'heure de fermeture doit être après l'heure d'ouverture.`
        );

        return false;
      }
    }

    return true;
  }

  // ENREGISTREMENT DU PROFIL
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validateBusinessHours()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/pro/profil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          businessHours,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible d'enregistrer votre profil."
        );
      }

      setHasProfile(true);

      if (data.profile?.isPublished !== undefined) {
        setIsPublished(Boolean(data.profile.isPublished));
      }

      setSuccess(
        "Votre profil et vos horaires ont été enregistrés avec succès."
      );
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

  // PUBLICATION DE L'ÉTABLISSEMENT
  async function handlePublish() {
    setError("");
    setSuccess("");

    if (!hasProfile) {
      setError(
        "Veuillez d'abord enregistrer les informations de votre établissement."
      );
      return;
    }

    if (isPublished) {
      return;
    }

    setPublishing(true);

    try {
      const response = await fetch(
        "/api/pro/profil/publication",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de publier votre établissement."
        );
      }

      setIsPublished(true);

      setSuccess(
        "Félicitations ! Votre établissement est maintenant publié sur Reserve X."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant la publication."
      );
    } finally {
      setPublishing(false);
    }
  }

  // CHARGEMENT INITIAL
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc]">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#533afd]" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Chargement de votre profil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-7 text-[#061b31] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">

        {/* RETOUR */}

        <button
          type="button"
          onClick={() => router.back()}
          className="mb-7 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition hover:text-[#533afd]"
        >
          <ArrowLeft size={18} />
          Retour
        </button>

        {/* TITRE */}

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#533afd]/10 px-3 py-2 text-xs font-bold text-[#533afd]">
            <Building2 size={15} />
            Espace professionnel
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#061b31] sm:text-3xl">
            Profil professionnel
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Présentez votre établissement et définissez vos horaires
            de réservation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* INFORMATIONS GÉNÉRALES */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                <Building2 size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#061b31]">
                  Informations générales
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Présentez votre activité professionnelle.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                  Nom de l'établissement
                </label>

                <input
                  type="text"
                  required
                  value={form.businessName}
                  onChange={(e) =>
                    updateField("businessName", e.target.value)
                  }
                  placeholder="Ex : Hôtel Le Prestige"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                  Catégorie professionnelle
                </label>

                <select
                  required
                  value={form.category}
                  onChange={(e) =>
                    updateField("category", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                >
                  <option value="">
                    Choisir une catégorie
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  placeholder="Présentez votre activité..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                />
              </div>
            </div>
          </section>

          {/* LOCALISATION */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                <MapPin size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#061b31]">
                  Localisation
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Indiquez où se trouve votre établissement.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                  Adresse
                </label>

                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  placeholder="Quartier, rue, repère..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                    Ville
                  </label>

                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      updateField("city", e.target.value)
                    }
                    placeholder="Lomé"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#061b31]">
                    <Globe size={16} className="text-[#533afd]" />
                    Pays
                  </label>

                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) =>
                      updateField("country", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* COORDONNÉES */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                <Phone size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#061b31]">
                  Coordonnées professionnelles
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Permettez à vos clients de vous contacter.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#061b31]">
                  <Mail size={16} className="text-[#533afd]" />
                  Adresse e-mail
                </label>

                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    updateField("contactEmail", e.target.value)
                  }
                  placeholder="contact@exemple.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#061b31]">
                  <Phone size={16} className="text-[#533afd]" />
                  Téléphone professionnel
                </label>

                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) =>
                    updateField("contactPhone", e.target.value)
                  }
                  placeholder="+228..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                />
              </div>
            </div>
          </section>

          {/* HORAIRES */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                <Clock size={21} />
              </div>

              <h2 className="text-lg font-bold text-[#061b31]">
                Horaires d'ouverture
              </h2>
            </div>

            <p className="mb-6 text-sm leading-6 text-slate-500">
              Définissez les jours et les heures pendant lesquels
              votre établissement accepte les réservations.
            </p>

            <div className="space-y-3">
              {days.map((day) => {
                const hour = businessHours.find(
                  (item) => item.dayOfWeek === day.value
                );

                if (!hour) return null;

                return (
                  <div
                    key={day.value}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-[#533afd]/20"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center justify-between gap-4 sm:w-36">
                        <span className="text-sm font-semibold text-[#061b31]">
                          {day.label}
                        </span>

                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hour.isOpen}
                            onChange={(e) =>
                              updateBusinessHour(
                                day.value,
                                "isOpen",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 accent-[#533afd] focus:ring-[#533afd]"
                          />

                          <span
                            className={`text-sm font-semibold ${
                              hour.isOpen
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}
                          >
                            {hour.isOpen ? "Ouvert" : "Fermé"}
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          value={hour.openTime}
                          disabled={!hour.isOpen}
                          onChange={(e) =>
                            updateBusinessHour(
                              day.value,
                              "openTime",
                              e.target.value
                            )
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#061b31] outline-none transition focus:border-[#533afd] focus:ring-2 focus:ring-[#533afd]/10 disabled:bg-slate-100 disabled:text-slate-400 sm:w-32"
                        />

                        <span className="text-sm font-medium text-slate-400">
                          à
                        </span>

                        <input
                          type="time"
                          value={hour.closeTime}
                          disabled={!hour.isOpen}
                          onChange={(e) =>
                            updateBusinessHour(
                              day.value,
                              "closeTime",
                              e.target.value
                            )
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#061b31] outline-none transition focus:border-[#533afd] focus:ring-2 focus:ring-[#533afd]/10 disabled:bg-slate-100 disabled:text-slate-400 sm:w-32"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-[#533afd]/10 bg-[#533afd]/5 p-4 text-sm leading-6 text-[#061b31]">
              Ces horaires serviront à déterminer quand les clients
              pourront effectuer leurs réservations.
            </div>
          </section>

          {/* MESSAGES */}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              <span className="shrink-0">!</span>
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={19} className="shrink-0" />
              {success}
            </div>
          )}

          {/* ENREGISTREMENT */}

          <button
            type="submit"
            disabled={saving || publishing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#533afd] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={19} />
                Enregistrer mon profil
              </>
            )}
          </button>
        </form>

        {/* PUBLICATION */}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
              <Eye size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#061b31]">
                Visibilité de votre établissement
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Gérez la présence de votre établissement sur Reserve X.
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-500">
            Publiez votre établissement pour permettre aux clients
            de le découvrir et de réserver vos prestations sur
            Reserve X.
          </p>

          {isPublished ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                size={22}
                className="shrink-0 text-emerald-600"
              />

              <div>
                <p className="font-bold text-emerald-800">
                  Établissement publié !
                </p>

                <p className="mt-1 text-sm leading-5 text-emerald-700">
                  Votre établissement est maintenant publié sur
                  Reserve X.
                </p>
              </div>
            </div>
          ) : (
            <>
              {!hasProfile && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-800">
                  Vous devez d'abord enregistrer les informations
                  de votre établissement avant de pouvoir le publier.
                </div>
              )}

              <button
                type="button"
                onClick={handlePublish}
                disabled={!hasProfile || publishing || saving}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#533afd] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />
                    Publication en cours...
                  </>
                ) : (
                  <>
                    <Building2 size={19} />
                    Publier mon établissement
                  </>
                )}
              </button>
            </>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          © 2026 Reserve X — Espace professionnel.
        </footer>
      </div>
    </main>
  );
}