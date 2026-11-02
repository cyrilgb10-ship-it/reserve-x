"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Save,
  Loader2,
  ArrowLeft,
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

export default function ProfilPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/pro/profil");
        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          router.push("/pro/connexion");
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || "Impossible de charger le profil.");
        }

        if (data.profile) {
          setForm({
            businessName: data.profile.businessName || "",
            category: data.profile.category || "",
            description: data.profile.description || "",
            address: data.profile.address || "",
            city: data.profile.city || "",
            country: data.profile.country || "Togo",
            contactEmail: data.profile.contactEmail || "",
            contactPhone: data.profile.contactPhone || "",
          });
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

  function updateField(
    field: keyof ProfileForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch("/api/pro/profil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible d'enregistrer le profil."
        );
      }

      setSuccess("Votre établissement a été enregistré avec succès.");

      setTimeout(() => {
        router.push("/pro/dashboard");
        router.refresh();
      }, 1200);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/pro/dashboard")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Retour au tableau de bord
        </button>

        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <Building2 size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Profil de votre établissement
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Présentez votre activité et renseignez les informations
            nécessaires pour permettre à vos clients de vous contacter.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div>
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              Informations générales
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nom de l'établissement *
                </label>

                <div className="relative">
                  <Building2
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.businessName}
                    onChange={(e) =>
                      updateField("businessName", e.target.value)
                    }
                    placeholder="Ex : Hôtel Le Prestige"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Catégorie d'activité *
                </label>

                <select
                  required
                  value={form.category}
                  onChange={(e) =>
                    updateField("category", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Sélectionner une catégorie</option>

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
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description de votre activité
                </label>

                <div className="relative">
                  <FileText
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                  <textarea
                    rows={5}
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    placeholder="Présentez votre établissement, vos services et ce qui vous distingue..."
                    className="w-full resize-y rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.description.length}/2000 caractères
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              Localisation
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Adresse
                </label>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    maxLength={250}
                    value={form.address}
                    onChange={(e) =>
                      updateField("address", e.target.value)
                    }
                    placeholder="Quartier, rue, repère..."
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Ville *
                  </label>

                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.city}
                    onChange={(e) =>
                      updateField("city", e.target.value)
                    }
                    placeholder="Ex : Lomé"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Pays *
                  </label>

                  <input
                    required
                    value={form.country}
                    onChange={(e) =>
                      updateField("country", e.target.value)
                    }
                    placeholder="Ex : Togo"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              Coordonnées professionnelles
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Adresse e-mail de contact
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) =>
                      updateField("contactEmail", e.target.value)
                    }
                    placeholder="contact@etablissement.com"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Téléphone professionnel
                </label>

                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type="tel"
                    maxLength={30}
                    value={form.contactPhone}
                    onChange={(e) =>
                      updateField("contactPhone", e.target.value)
                    }
                    placeholder="+228 XX XX XX XX"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={18} />
                Enregistrer mon établissement
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}