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
} from "lucide-react";

import MobileMenu from "@/components/pro/MobileMenu";

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
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  durationMinutes: "",
  capacity: "1",
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

export default function PrestationsManager() {
  const [services, setServices] = useState<Service[]>([]);
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

      setServices(data.services ?? []);
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

  function openCreateModal() {
    setEditingService(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);

    setForm({
      name: service.name,
      description: service.description ?? "",
      price: String(service.price),
      durationMinutes: service.durationMinutes
        ? String(service.durationMinutes)
        : "",
      capacity: String(service.capacity),
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

  function updateField(
    field: keyof ServiceForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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
      setError("Veuillez saisir une capacité valide.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      durationMinutes,
      capacity,
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

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#061b31]">

      {/* SIDEBAR DESKTOP */}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">

        <Link
          href="/"
          className="flex h-20 items-center gap-2 border-b border-slate-100 px-7 text-2xl font-bold"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd] text-white">
            R
          </span>
          Reserve<span className="text-[#533afd]">X</span>
        </Link>

        <div className="flex-1 px-4 py-7">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
            Espace professionnel
          </p>

          <nav className="space-y-1">
            <Link
              href="/pro/dashboard"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LayoutDashboard size={19} />
              Tableau de bord
            </Link>

            <Link
              href="/pro/profil"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Store size={19} />
              Mon établissement
            </Link>

            <Link
              href="/pro/prestations"
              className="flex items-center gap-3 rounded-xl bg-[#533afd]/10 px-4 py-3 text-sm font-semibold text-[#533afd]"
            >
              <Building2 size={19} />
              Mes prestations
            </Link>

            <Link
              href="/pro/reservations"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <CalendarDays size={19} />
              Réservations
            </Link>

            <Link
              href="/pro/portefeuille"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Wallet size={19} />
              Portefeuille
            </Link>

            <Link
              href="/pro/abonnement"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Settings size={19} />
              Abonnement
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-100 p-5">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Retour au site
          </Link>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}

      <div className="lg:pl-64">

        {/* HEADER */}

        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <MobileMenu />

            <div>
              <p className="text-xs font-medium text-slate-400">
                Espace professionnel
              </p>

              <h1 className="mt-1 text-base font-bold sm:text-lg">
                Mes prestations
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#533afd] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#4229e8] sm:px-5 sm:text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Ajouter une prestation</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </header>

        <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">

          {/* INTRODUCTION */}

          <section className="mb-8">
            <Link
              href="/pro/dashboard"
              className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-[#533afd]"
            >
              <ArrowLeft size={15} />
              Retour au tableau de bord
            </Link>

            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Gérez vos prestations.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Présentez vos services, définissez vos tarifs et contrôlez les
              prestations visibles par vos clients.
            </p>
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
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-[#533afd] focus:bg-white"
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
                        ? "bg-[#533afd] text-white"
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
                <h3 className="text-lg font-bold">
                  Vos prestations
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  {filteredServices.length} résultat(s)
                </p>
              </div>

              <button
                type="button"
                onClick={loadServices}
                className="text-xs font-semibold text-[#533afd] hover:underline"
              >
                Actualiser
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
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
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50"
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

                      <h4 className="mt-5 text-lg font-bold">
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
                            Capacité : {service.capacity}
                          </span>

                        </div>

                        <p className="mt-3 text-xs text-slate-400">
                          {service._count?.bookings ?? 0} réservation(s)
                        </p>

                      </div>

                    </div>

                    <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/70">

                      <button
                        type="button"
                        onClick={() => openEditModal(service)}
                        className="flex items-center justify-center gap-2 border-r border-slate-100 px-2 py-4 text-xs font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-[#533afd]"
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

                <h4 className="mt-5 text-lg font-bold">
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
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#533afd] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#4229e8]"
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

          <section className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#533afd]">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h4 className="font-bold">
                  Quelques conseils
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Utilisez des noms précis, décrivez clairement vos services
                  et indiquez des tarifs à jour. Vous pouvez désactiver
                  temporairement une prestation sans perdre son historique
                  de réservations.
                </p>
              </div>

            </div>
          </section>

          <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
            © 2026 Reserve X — Espace professionnel.
          </footer>

        </div>
      </div>

      {/* MODAL AJOUT / MODIFICATION */}

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="my-auto w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 p-6">

              <div>
                <h3 className="text-xl font-bold">
                  {editingService
                    ? "Modifier la prestation"
                    : "Nouvelle prestation"}
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Renseignez les informations de votre service.
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

            <form onSubmit={handleSubmit} className="space-y-5 p-6">

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Nom de la prestation *
                </label>

                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Ex. Chambre climatisée"
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#533afd]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
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
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#533afd]"
                />

                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {form.description.length}/2000
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Prix (FCFA) *
                  </label>

                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    placeholder="Ex. 15000"
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#533afd]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
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
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#533afd]"
                  />
                </div>

              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Capacité *
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
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#533afd]"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Nombre de clients pouvant bénéficier de cette prestation
                  sur le même créneau.
                </p>
              </div>

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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#533afd] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingService ? "Enregistrer les modifications" : "Créer la prestation"}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          {label}
        </span>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-5 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}