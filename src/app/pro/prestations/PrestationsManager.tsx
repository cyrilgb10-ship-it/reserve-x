"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  Building2,
  Clock,
  Users,
  Pencil,
  Power,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Settings,
  Grip,
  Lock,
} from "lucide-react";

import MobileMenu from "@/components/pro/MobileMenu";

type Category =
  | "HOTEL"
  | "RESTAURANT"
  | "EVENT"
  | "VENUE"
  | "PHOTOGRAPHY"
  | "BEAUTY"
  | "VEHICLE"
  | "TRANSPORT"
  | "MECHANIC"
  | "TECHNICIAN"
  | "ARTISAN"
  | "OTHER";

type FieldType =
  | "TEXT"
  | "NUMBER"
  | "PHONE"
  | "EMAIL"
  | "SELECT"
  | "CHECKBOX";

type CustomField = {
  id?: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  customFields: CustomField[];
  _count?: {
    bookings: number;
  };
};

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  capacity: string;
  customFields: CustomField[];
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  durationMinutes: "",
  capacity: "1",
  customFields: [],
};

const categoryNames: Record<Category, string> = {
  HOTEL: "Hôtel / Hébergement",
  RESTAURANT: "Restaurant",
  EVENT: "Événement",
  VENUE: "Salle / Espace",
  PHOTOGRAPHY: "Photographie",
  BEAUTY: "Beauté / Bien-être",
  VEHICLE: "Location de véhicules",
  TRANSPORT: "Transport",
  MECHANIC: "Mécanique",
  TECHNICIAN: "Technicien",
  ARTISAN: "Artisan",
  OTHER: "Autre activité",
};

const categoryFields: Record<Category, CustomField[]> = {
  HOTEL: [
    {
      label: "Type de chambre",
      type: "SELECT",
      required: true,
      options: ["Chambre simple", "Chambre double", "Suite", "Appartement"],
    },
    {
      label: "Nombre de personnes",
      type: "NUMBER",
      required: true,
    },
    {
      label: "Nombre de nuits",
      type: "NUMBER",
      required: true,
    },
  ],

  RESTAURANT: [
    {
      label: "Nombre de personnes",
      type: "NUMBER",
      required: true,
    },
    {
      label: "Type de réservation",
      type: "SELECT",
      required: true,
      options: ["Table simple", "Anniversaire", "Événement privé", "Autre"],
    },
  ],

  EVENT: [
    {
      label: "Type d'événement",
      type: "SELECT",
      required: true,
      options: ["Mariage", "Anniversaire", "Conférence", "Concert", "Autre"],
    },
    {
      label: "Nombre de participants",
      type: "NUMBER",
      required: true,
    },
  ],

  VENUE: [
    {
      label: "Nombre de personnes attendues",
      type: "NUMBER",
      required: true,
    },
    {
      label: "Équipements nécessaires",
      type: "TEXT",
      required: false,
    },
  ],

  PHOTOGRAPHY: [
    {
      label: "Type de séance",
      type: "SELECT",
      required: true,
      options: ["Portrait", "Mariage", "Famille", "Événement", "Produit"],
    },
    {
      label: "Nombre de photos souhaitées",
      type: "NUMBER",
      required: false,
    },
  ],

  BEAUTY: [
    {
      label: "Type de soin",
      type: "SELECT",
      required: true,
      options: ["Coiffure", "Maquillage", "Manucure", "Pédicure", "Massage", "Autre"],
    },
    {
      label: "Informations complémentaires",
      type: "TEXT",
      required: false,
    },
  ],

  VEHICLE: [
    {
      label: "Catégorie de véhicule",
      type: "SELECT",
      required: true,
      options: ["Moto", "Voiture", "SUV", "Minibus", "Camion", "Autre"],
    },
    {
      label: "Durée de location (jours)",
      type: "NUMBER",
      required: true,
    },
  ],

  TRANSPORT: [
    {
      label: "Lieu de départ",
      type: "TEXT",
      required: true,
    },
    {
      label: "Destination",
      type: "TEXT",
      required: true,
    },
    {
      label: "Nombre de passagers",
      type: "NUMBER",
      required: true,
    },
  ],

  MECHANIC: [
    {
      label: "Type de véhicule",
      type: "TEXT",
      required: true,
    },
    {
      label: "Problème rencontré",
      type: "TEXT",
      required: true,
    },
  ],

  TECHNICIAN: [
    {
      label: "Type d'intervention",
      type: "SELECT",
      required: true,
      options: ["Installation", "Réparation", "Maintenance", "Diagnostic", "Autre"],
    },
    {
      label: "Description du problème",
      type: "TEXT",
      required: true,
    },
  ],

  ARTISAN: [
    {
      label: "Type de travaux",
      type: "TEXT",
      required: true,
    },
    {
      label: "Description du besoin",
      type: "TEXT",
      required: true,
    },
  ],

  OTHER: [
    {
      label: "Précisez votre besoin",
      type: "TEXT",
      required: true,
    },
    {
      label: "Informations complémentaires",
      type: "TEXT",
      required: false,
    },
  ],
};

function formatAmount(amount: number, currency = "XOF") {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency}`;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "Non définie";

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining > 0
    ? `${hours} h ${remaining} min`
    : `${hours} h`;
}

function normalizeFields(fields: unknown): CustomField[] {
  if (!Array.isArray(fields)) return [];

  return fields.map((field) => {
    const item = field as Record<string, unknown>;

    return {
      id: typeof item.id === "string" ? item.id : undefined,
      label: typeof item.label === "string" ? item.label : "",
      type: (
        typeof item.type === "string" ? item.type : "TEXT"
      ) as FieldType,
      required: item.required === true,
      options: Array.isArray(item.options)
        ? item.options.filter(
            (option): option is string => typeof option === "string"
          )
        : [],
    };
  });
}

export default function PrestationsManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [category, setCategory] = useState<Category | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pro/prestations", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger les prestations.");
      }

      setCategory(data.category ?? null);

      setServices(
        (data.services ?? []).map((service: Service) => ({
          ...service,
          customFields: normalizeFields(service.customFields),
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  function getDefaultFields(): CustomField[] {
    if (!category) return [];

    return categoryFields[category].map((field) => ({
      ...field,
      options: [...(field.options ?? [])],
    }));
  }

  function openCreateModal() {
    setEditingService(null);

    setForm({
      ...emptyForm,
      customFields: getDefaultFields(),
    });

    setError("");
    setModalOpen(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);

    const existingFields = normalizeFields(service.customFields);

    setForm({
      name: service.name,
      description: service.description ?? "",
      price: String(service.price),
      durationMinutes: service.durationMinutes
        ? String(service.durationMinutes)
        : "",
      capacity: String(service.capacity),
      customFields:
        existingFields.length > 0
          ? existingFields
          : service._count?.bookings
            ? []
            : getDefaultFields(),
    });

    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingService(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField(field: keyof Omit<ServiceForm, "customFields">, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateCustomField(
    index: number,
    updates: Partial<CustomField>
  ) {
    setForm((current) => ({
      ...current,
      customFields: current.customFields.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      ),
    }));
  }

  function addCustomField() {
    setForm((current) => ({
      ...current,
      customFields: [
        ...current.customFields,
        {
          label: "",
          type: "TEXT",
          required: false,
          options: [],
        },
      ],
    }));
  }

  function removeCustomField(index: number) {
    setForm((current) => ({
      ...current,
      customFields: current.customFields.filter((_, i) => i !== index),
    }));
  }

  function updateFieldOptions(index: number, value: string) {
    updateCustomField(index, {
      options: value
        .split("\n")
        .map((option) => option.trim())
        .filter(Boolean),
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const price = Number(form.price);
    const durationMinutes = form.durationMinutes
      ? Number(form.durationMinutes)
      : null;
    const capacity = Number(form.capacity);

    if (!Number.isSafeInteger(price) || price <= 0) {
      setError("Veuillez saisir un prix valide.");
      setSaving(false);
      return;
    }

    if (
      durationMinutes !== null &&
      (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0)
    ) {
      setError("Veuillez saisir une durée valide.");
      setSaving(false);
      return;
    }

    if (!Number.isSafeInteger(capacity) || capacity <= 0) {
      setError("Veuillez saisir une capacité journalière valide.");
      setSaving(false);
      return;
    }

    const fieldsLocked =
      Boolean(editingService) &&
      (editingService?._count?.bookings ?? 0) > 0;

    const customFields = fieldsLocked
      ? undefined
      : form.customFields.map((field) => ({
          label: field.label.trim(),
          type: field.type,
          required: field.required,
          ...(field.type === "SELECT"
            ? { options: field.options ?? [] }
            : {}),
        }));

    if (customFields) {
      if (
        customFields.some(
          (field) => field.label.length < 2 || field.label.length > 100
        )
      ) {
        setError("Chaque champ doit avoir un intitulé de 2 à 100 caractères.");
        setSaving(false);
        return;
      }

      const labels = customFields.map((field) => field.label.toLowerCase());

      if (new Set(labels).size !== labels.length) {
        setError("Les intitulés des champs doivent être différents.");
        setSaving(false);
        return;
      }

      if (
        customFields.some(
          (field) =>
            field.type === "SELECT" &&
            (!field.options || field.options.length === 0)
        )
      ) {
        setError("Ajoutez au moins une option à chaque liste déroulante.");
        setSaving(false);
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      durationMinutes,
      capacity,
      ...(customFields !== undefined ? { customFields } : {}),
    };

    try {
      const response = await fetch("/api/pro/prestations", {
        method: editingService ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingService
            ? { id: editingService.id, ...payload }
            : payload
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'enregistrer la prestation.");
      }

      setModalOpen(false);
      setEditingService(null);
      setForm(emptyForm);

      setSuccess(
        editingService
          ? "Prestation modifiée avec succès."
          : "Prestation ajoutée avec succès."
      );

      await loadServices();
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

  async function toggleService(service: Service) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/pro/prestations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: service.id,
          isActive: !service.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de modifier le statut.");
      }

      setSuccess(
        service.isActive
          ? "Prestation désactivée."
          : "Prestation réactivée."
      );

      await loadServices();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    }
  }

  async function deactivateService(service: Service) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment désactiver « ${service.name} » ?\n\nCette prestation ne sera plus proposée aux nouveaux clients. Son historique de réservations sera conservé.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/pro/prestations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: service.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de désactiver la prestation.");
      }

      setSuccess("Prestation désactivée avec succès.");
      await loadServices();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    }
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      (service.description ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "ALL" ||
      (filter === "ACTIVE" && service.isActive) ||
      (filter === "INACTIVE" && !service.isActive);

    return matchesSearch && matchesFilter;
  });

  const activeCount = services.filter((service) => service.isActive).length;
  const inactiveCount = services.length - activeCount;

  const fieldsLocked =
    Boolean(editingService) &&
    (editingService?._count?.bookings ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#061b31]">

      {/* SIDEBAR DESKTOP */}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-[#061b31] text-white lg:flex">
        <Link
          href="/"
          className="flex h-20 items-center gap-2 border-b border-white/10 px-7 text-2xl font-bold"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white">
            R
          </span>
          Reserve<span className="text-[#8d7cff]">X</span>
        </Link>

        <div className="flex-1 px-4 py-7">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
            Espace professionnel
          </p>

          <nav className="space-y-1">
            <Link
              href="/pro/dashboard"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <LayoutDashboard size={19} />
              Tableau de bord
            </Link>

            <Link
              href="/pro/profil"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Store size={19} />
              Mon établissement
            </Link>

            <Link
              href="/pro/prestations"
              className="flex items-center gap-3 rounded-xl bg-[#533afd] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#533afd]/20"
            >
              <Building2 size={19} />
              Mes prestations
            </Link>

            <Link
              href="/pro/reservations"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <CalendarDays size={19} />
              Réservations
            </Link>

            <Link
              href="/pro/portefeuille"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Wallet size={19} />
              Portefeuille
            </Link>

            <Link
              href="/pro/abonnement"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Settings size={19} />
              Abonnement
            </Link>
          </nav>
        </div>

        <div className="border-t border-white/10 p-5">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={18} />
            Retour au site
          </Link>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <MobileMenu />
            <div>
              <p className="text-xs font-medium text-slate-400">
                Espace professionnel
              </p>
              <h1 className="mt-1 text-base font-bold text-[#061b31] sm:text-lg">
                Mes prestations
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#533afd] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:bg-[#4229e8] sm:px-5 sm:text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Ajouter une prestation</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </header>

        <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
          <section className="mb-8">
            <Link
              href="/pro/dashboard"
              className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-[#533afd]"
            >
              <ArrowLeft size={15} />
              Retour au tableau de bord
            </Link>

            <h2 className="text-2xl font-bold tracking-tight text-[#061b31] sm:text-4xl">
              Gérez vos prestations.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Présentez vos services, définissez vos tarifs et contrôlez les prestations visibles par vos clients.
            </p>

            {category && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#533afd]/10 bg-[#533afd]/10 px-4 py-2 text-xs font-bold text-[#533afd]">
                <Store size={15} />
                Catégorie : {categoryNames[category]}
              </div>
            )}
          </section>

          {/* MESSAGES */}

          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={19} />
              {success}
              <button
                type="button"
                onClick={() => setSuccess("")}
                className="ml-auto"
                aria-label="Fermer"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {error && !modalOpen && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              <AlertCircle size={19} />
              {error}
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto"
                aria-label="Fermer"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* STATISTIQUES */}

          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Total des prestations"
              value={services.length}
              icon={<Building2 size={21} />}
            />
            <SummaryCard
              label="Prestations actives"
              value={activeCount}
              icon={<CheckCircle2 size={21} />}
              color="green"
            />
            <SummaryCard
              label="Prestations désactivées"
              value={inactiveCount}
              icon={<Power size={21} />}
              color="orange"
            />
          </section>

          {/* FILTRES */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une prestation..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10"
                />
              </div>

              <div className="flex gap-2">
                {[
                  { label: "Toutes", value: "ALL" },
                  { label: "Actives", value: "ACTIVE" },
                  { label: "Désactivées", value: "INACTIVE" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold transition sm:flex-none sm:px-5 ${
                      filter === item.value
                        ? "bg-[#533afd] text-white shadow-md shadow-[#533afd]/20"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* LISTE */}

          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#061b31]">
                  Vos prestations
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {filteredServices.length} résultat(s)
                </p>
              </div>

              <button
                type="button"
                onClick={loadServices}
                className="text-xs font-semibold text-[#533afd] transition hover:underline"
              >
                Actualiser
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
                <Loader2
                  size={30}
                  className="mx-auto animate-spin text-[#533afd]"
                />
                <p className="mt-4 text-sm text-slate-500">
                  Chargement de vos prestations...
                </p>
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredServices.map((service) => (
                  <article
                    key={service.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#533afd]/20 hover:shadow-xl hover:shadow-slate-200/60"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                          <Building2 size={23} />
                        </div>

                        <span
                          className={`rounded-full px-3 py-2 text-[10px] font-bold ${
                            service.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {service.isActive ? "ACTIVE" : "DÉSACTIVÉE"}
                        </span>
                      </div>

                      <h4 className="mt-5 text-lg font-bold text-[#061b31]">
                        {service.name}
                      </h4>

                      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                        {service.description || "Aucune description renseignée."}
                      </p>

                      <div className="mt-6 border-t border-slate-100 pt-5">
                        <p className="text-2xl font-bold text-[#533afd]">
                          {formatAmount(service.price, service.currency)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <Clock size={15} />
                            {formatDuration(service.durationMinutes)}
                          </span>

                          <span className="inline-flex items-center gap-2">
                            <Users size={15} />
                            Max. {service.capacity} client(s)/jour
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-slate-400">
                          {service._count?.bookings ?? 0} réservation(s)
                        </p>

                        {service.customFields.length > 0 && (
                          <p className="mt-2 text-xs font-medium text-[#533afd]">
                            {service.customFields.length} information(s) demandée(s) au client
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/80">
                      <button
                        type="button"
                        onClick={() => openEditModal(service)}
                        className="flex items-center justify-center gap-2 border-r border-slate-100 px-2 py-4 text-xs font-bold text-slate-600 transition hover:bg-[#533afd]/10 hover:text-[#533afd]"
                      >
                        <Pencil size={15} />
                        Modifier
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleService(service)}
                        className="flex items-center justify-center gap-2 border-r border-slate-100 px-2 py-4 text-xs font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Power size={15} />
                        {service.isActive ? "Désactiver" : "Activer"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deactivateService(service)}
                        disabled={!service.isActive}
                        className="flex items-center justify-center gap-2 px-2 py-4 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                        Retirer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
                  <Building2 size={29} />
                </div>

                <h4 className="mt-5 text-lg font-bold text-[#061b31]">
                  {services.length === 0
                    ? "Aucune prestation pour le moment"
                    : "Aucun résultat"}
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {services.length === 0
                    ? "Ajoutez votre première prestation pour permettre à vos clients de découvrir vos services et de réserver."
                    : "Essayez de modifier votre recherche ou votre filtre."}
                </p>

                {services.length === 0 && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#533afd] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:bg-[#4229e8]"
                  >
                    <Plus size={18} />
                    Ajouter ma première prestation
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}
          </section>

          {/* CONSEIL */}

          <section className="mt-10 rounded-2xl border border-[#533afd]/10 bg-[#533afd]/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#533afd] shadow-sm">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h4 className="font-bold text-[#061b31]">
                  Quelques conseils
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Utilisez des noms précis, décrivez clairement vos services et indiquez des tarifs à jour. Vous pouvez désactiver temporairement une prestation sans perdre son historique de réservations.
                </p>
              </div>
            </div>
          </section>

          <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
            © 2026 Reserve X — Espace professionnel.
          </footer>
        </div>
      </div>

      {/* MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#061b31]/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-bold text-[#061b31]">
                  {editingService
                    ? "Modifier la prestation"
                    : "Nouvelle prestation"}
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  {category
                    ? categoryNames[category]
                    : "Configuration de votre prestation"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[80vh] space-y-6 overflow-y-auto p-6"
            >
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* INFORMATIONS GÉNÉRALES */}

              <section className="space-y-5">
                <div>
                  <h4 className="font-bold text-[#061b31]">
                    Informations générales
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Les informations principales de votre prestation.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                    Nom de la prestation *
                  </label>

                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="Ex. Chambre climatisée"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                    Description
                  </label>

                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Décrivez votre prestation..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                  />

                  <p className="mt-1 text-right text-[10px] text-slate-400">
                    {form.description.length}/2000
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                      Prix (FCFA) *
                    </label>

                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={form.price}
                      onChange={(event) =>
                        updateField("price", event.target.value)
                      }
                      placeholder="Ex. 15000"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                      Durée (minutes)
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.durationMinutes}
                      onChange={(event) =>
                        updateField("durationMinutes", event.target.value)
                      }
                      placeholder="Ex. 60"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#061b31]">
                    Nombre maximal de clients par jour *
                  </label>

                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.capacity}
                    onChange={(event) =>
                      updateField("capacity", event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Nombre total de clients pouvant bénéficier de cette prestation sur une journée, tous créneaux confondus.
                  </p>
                </div>
              </section>

              {/* CHAMPS PERSONNALISÉS */}

              <section className="space-y-5 border-t border-slate-100 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-[#061b31]">
                      Informations demandées au client
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Ces questions apparaîtront pendant la réservation.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#533afd]/10 px-3 py-2 text-[10px] font-bold text-[#533afd]">
                    {form.customFields.length} champ(s)
                  </span>
                </div>

                {fieldsLocked ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                      <Lock size={17} />
                      Champs verrouillés
                    </div>

                    <p className="mt-2 text-xs leading-5 text-amber-700">
                      Cette prestation possède déjà des réservations. Les champs personnalisés ne peuvent plus être modifiés afin de préserver les informations enregistrées.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#533afd]/10 bg-[#533afd]/5 p-4">
                    <p className="text-xs leading-5 text-[#061b31]">
                      Nous avons préparé des questions adaptées à votre activité. Vous pouvez modifier les intitulés, les types de réponses, les options et les champs obligatoires.
                    </p>
                  </div>
                )}

                {form.customFields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                    <Grip size={24} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Aucun champ supplémentaire
                    </p>
                    {!fieldsLocked && (
                      <p className="mt-1 text-xs text-slate-400">
                        Vous pouvez ajouter des questions pour vos clients.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.customFields.map((field, index) => (
                      <div
                        key={field.id ?? index}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">
                            QUESTION {index + 1}
                          </span>

                          {!fieldsLocked && (
                            <button
                              type="button"
                              onClick={() => removeCustomField(index)}
                              className="flex items-center gap-1 text-xs font-semibold text-red-500 transition hover:text-red-700"
                            >
                              <Trash2 size={14} />
                              Supprimer
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="mb-2 block text-xs font-semibold text-[#061b31]">
                              Intitulé de la question
                            </label>

                            <input
                              value={field.label}
                              disabled={fieldsLocked}
                              onChange={(event) =>
                                updateCustomField(index, {
                                  label: event.target.value,
                                })
                              }
                              placeholder="Ex. Nombre de personnes"
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10 disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-[#061b31]">
                              Type de réponse
                            </label>

                            <select
                              value={field.type}
                              disabled={fieldsLocked}
                              onChange={(event) => {
                                const type = event.target.value as FieldType;

                                updateCustomField(index, {
                                  type,
                                  options:
                                    type === "SELECT"
                                      ? ["Option 1", "Option 2"]
                                      : [],
                                });
                              }}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10 disabled:bg-slate-100"
                            >
                              <option value="TEXT">Texte libre</option>
                              <option value="NUMBER">Nombre</option>
                              <option value="PHONE">Téléphone</option>
                              <option value="EMAIL">Adresse e-mail</option>
                              <option value="SELECT">Liste déroulante</option>
                              <option value="CHECKBOX">Case à cocher</option>
                            </select>
                          </div>

                          {field.type === "SELECT" && (
                            <div>
                              <label className="mb-2 block text-xs font-semibold text-[#061b31]">
                                Options (une option par ligne)
                              </label>

                              <textarea
                                rows={3}
                                disabled={fieldsLocked}
                                value={(field.options ?? []).join("\n")}
                                onChange={(event) =>
                                  updateFieldOptions(index, event.target.value)
                                }
                                placeholder={"Option 1\nOption 2\nOption 3"}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#533afd] focus:ring-4 focus:ring-[#533afd]/10 disabled:bg-slate-100"
                              />
                            </div>
                          )}

                          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <input
                              type="checkbox"
                              checked={field.required}
                              disabled={fieldsLocked}
                              onChange={(event) =>
                                updateCustomField(index, {
                                  required: event.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-slate-300 accent-[#533afd]"
                            />
                            Réponse obligatoire pour le client
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!fieldsLocked && (
                  <button
                    type="button"
                    onClick={addCustomField}
                    disabled={form.customFields.length >= 15}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#533afd]/40 py-3 text-sm font-bold text-[#533afd] transition hover:bg-[#533afd]/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={17} />
                    Ajouter une question
                  </button>
                )}

                <p className="text-[11px] leading-5 text-slate-400">
                  Maximum 15 questions par prestation. Les réponses des clients seront conservées avec leur réservation.
                </p>
              </section>

              {/* BOUTONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#533afd] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#533afd]/20 transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingService
                        ? "Enregistrer les modifications"
                        : "Créer la prestation"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color = "purple",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "purple" | "green" | "orange";
}) {
  const colors = {
    purple: "bg-[#533afd]/10 text-[#533afd]",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          {label}
        </span>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 text-3xl font-bold text-[#061b31]">
        {value}
      </p>
    </div>
  );
}