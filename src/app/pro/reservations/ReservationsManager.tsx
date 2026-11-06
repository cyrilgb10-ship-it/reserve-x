"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
  CalendarCheck,
  Filter,
  ScanLine,
  X,
} from "lucide-react";

import MobileMenu from "@/components/pro/MobileMenu";

type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

type Booking = {
  id: string;
  reference: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  customerEmail: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
  amount: number;
  currency: string;
  status: BookingStatus;
  qrToken: string | null;
  qrUsedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number | null;
  };
  payment: {
    amount: number;
    currency: string;
    status: string;
    network: string | null;
    paidAt: string | null;
    verifiedAt: string | null;
  } | null;
};

type Counts = {
  all: number;
  pendingPayment: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  expired: number;
  refunded: number;
};

const filters: {
  label: string;
  value: string;
  countKey: keyof Counts;
}[] = [
  { label: "Toutes", value: "ALL", countKey: "all" },
  {
    label: "En attente de paiement",
    value: "PENDING_PAYMENT",
    countKey: "pendingPayment",
  },
  { label: "Confirmées", value: "CONFIRMED", countKey: "confirmed" },
  { label: "Terminées", value: "COMPLETED", countKey: "completed" },
  { label: "Annulées", value: "CANCELLED", countKey: "cancelled" },
  { label: "Expirées", value: "EXPIRED", countKey: "expired" },
  { label: "Remboursées", value: "REFUNDED", countKey: "refunded" },
];

const statusConfig: Record<
  BookingStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  PENDING_PAYMENT: {
    label: "En attente de paiement",
    color: "border-orange-200 bg-orange-50 text-orange-700",
    icon: Hourglass,
  },
  CONFIRMED: {
    label: "Confirmée",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    icon: CalendarCheck,
  },
  COMPLETED: {
    label: "Terminée",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Annulée",
    color: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expirée",
    color: "border-slate-200 bg-slate-100 text-slate-600",
    icon: AlertCircle,
  },
  REFUNDED: {
    label: "Remboursée",
    color: "border-violet-200 bg-violet-50 text-violet-700",
    icon: RefreshCw,
  },
};

function formatAmount(amount: number, currency = "XOF") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function ReservationsManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [counts, setCounts] = useState<Counts>({
    all: 0,
    pendingPayment: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
    refunded: 0,
  });

  const [status, setStatus] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ÉTATS DU SCANNER QR

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [validatingQr, setValidatingQr] = useState(false);

  const [validationFeedback, setValidationFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const scannerControlsRef = useRef<{
    stop: () => void;
  } | null>(null);

  const scanHandledRef = useRef(false);

  // CHARGEMENT DES RÉSERVATIONS

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        status,
        search,
        page: String(page),
        limit: "15",
      });

      const response = await fetch(
        `/api/pro/reservations?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de charger les réservations."
        );
      }

      setBookings(data.bookings || []);
      setCounts(data.counts);
      setTotal(data.pagination.total);
      setTotalPages(Math.max(1, data.pagination.totalPages));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // RECHERCHE

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  // CHANGEMENT DE FILTRE

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  // VALIDATION DU QR CODE

  const validateScannedQr = useCallback(
    async (qrCode: string) => {
      setValidatingQr(true);
      setValidationFeedback(null);

      try {
        const response = await fetch(
          "/api/pro/reservations/validate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              qrCode,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Impossible de valider cette réservation."
          );
        }

        setValidationFeedback({
          type: "success",
          message:
            data.message ||
            "Réservation validée avec succès.",
        });

        await loadReservations();
      } catch (err) {
        setValidationFeedback({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Une erreur est survenue lors de la validation.",
        });
      } finally {
        setValidatingQr(false);
      }
    },
    [loadReservations]
  );

  // DÉMARRAGE ET ARRÊT DE LA CAMÉRA

  useEffect(() => {
    if (!scannerOpen) return;

    let cancelled = false;

    let controls: {
      stop: () => void;
    } | null = null;

    scanHandledRef.current = false;

    async function startCamera() {
      setScannerLoading(true);
      setScannerError("");

      try {
        const { BrowserMultiFormatReader } = await import(
          "@zxing/browser"
        );

        if (cancelled) return;

        const video = videoRef.current;

        if (!video) {
          throw new Error(
            "La caméra n'est pas disponible."
          );
        }

        const reader = new BrowserMultiFormatReader();

        controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            if (!result || scanHandledRef.current) {
              return;
            }

            scanHandledRef.current = true;

            const scannedValue = result.getText();

            controls?.stop();
            scannerControlsRef.current?.stop();

            setScannerOpen(false);

            void validateScannedQr(scannedValue);
          }
        );

        if (cancelled) {
          controls.stop();
        } else {
          scannerControlsRef.current = controls;
        }
      } catch (err) {
        if (!cancelled) {
          setScannerError(
            err instanceof Error
              ? err.message
              : "Impossible d'accéder à la caméra."
          );
        }
      } finally {
        if (!cancelled) {
          setScannerLoading(false);
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;

      controls?.stop();
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;

      const stream = videoRef.current?.srcObject;

      if (
        stream &&
        typeof MediaStream !== "undefined" &&
        stream instanceof MediaStream
      ) {
        stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [scannerOpen, validateScannedQr]);

  // FERMETURE DU SCANNER

  function closeScanner() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;

    setScannerOpen(false);
    setScannerError("");
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#061b31]">
      <MobileMenu />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

        {/* EN-TÊTE */}

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#533afd]">
              <CalendarDays size={17} />
              Gestion des réservations
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#061b31] sm:text-3xl">
              Mes réservations
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Consultez et suivez toutes les réservations de vos clients.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* BOUTON SCANNER */}

            <button
              onClick={() => {
                setValidationFeedback(null);
                setScannerError("");
                setScannerOpen(true);
              }}
              disabled={validatingQr}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#533afd] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4229e8] disabled:opacity-50"
            >
              <ScanLine size={17} />
              Scanner un QR code
            </button>

            {/* BOUTON ACTUALISER */}

            <button
              onClick={loadReservations}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#061b31] shadow-sm transition hover:border-[#533afd]/30 hover:bg-[#533afd]/5 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Actualiser
            </button>
          </div>
        </div>

        {/* STATISTIQUES */}

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total"
            value={counts.all}
            icon={CalendarDays}
            color="text-[#533afd]"
            bg="bg-[#533afd]/10"
          />

          <StatCard
            label="À confirmer"
            value={counts.pendingPayment}
            icon={Hourglass}
            color="text-orange-600"
            bg="bg-orange-50"
          />

          <StatCard
            label="Confirmées"
            value={counts.confirmed}
            icon={CalendarCheck}
            color="text-blue-600"
            bg="bg-blue-50"
          />

          <StatCard
            label="Terminées"
            value={counts.completed}
            icon={CheckCircle2}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
        </div>

        {/* RECHERCHE */}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Rechercher par référence, client, téléphone..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-[#533afd] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#533afd]/20 transition hover:bg-[#4229e8]"
            >
              Rechercher
            </button>
          </form>
        </div>

        {/* FILTRES */}

        <div className="mb-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#061b31]">
            <Filter size={16} className="text-[#533afd]" />
            Filtrer les réservations
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() =>
                  handleStatusChange(filter.value)
                }
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  status === filter.value
                    ? "border-[#533afd] bg-[#533afd] text-white shadow-md shadow-[#533afd]/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#533afd]/40 hover:bg-[#533afd]/5 hover:text-[#533afd]"
                }`}
              >
                {filter.label}

                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs ${
                    status === filter.value
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {counts[filter.countKey]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* RÉSULTATS */}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-[#061b31]">
              {total}
            </span>{" "}
            réservation(s)
          </p>

          <p className="text-xs font-medium text-slate-400">
            Page {page} sur {totalPages}
          </p>
        </div>

        {/* ERREUR DE CHARGEMENT */}

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertCircle size={19} className="shrink-0" />
            {error}
          </div>
        )}

        {/* RÉSULTAT DE LA VALIDATION QR */}

        {validationFeedback && (
          <div
            className={`mb-5 flex items-center gap-3 rounded-xl border p-4 text-sm font-medium ${
              validationFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {validationFeedback.type === "success" ? (
              <CheckCircle2
                size={19}
                className="shrink-0"
              />
            ) : (
              <AlertCircle
                size={19}
                className="shrink-0"
              />
            )}

            {validationFeedback.message}
          </div>
        )}

        {/* CHARGEMENT DE LA VALIDATION */}

        {validatingQr && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-700">
            <RefreshCw size={18} className="animate-spin" />
            Vérification et validation de la réservation...
          </div>
        )}

        {/* LISTE DES RÉSERVATIONS */}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <RefreshCw
              size={28}
              className="mx-auto animate-spin text-[#533afd]"
            />

            <p className="mt-4 text-sm text-slate-500">
              Chargement des réservations...
            </p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#533afd]/10 text-[#533afd]">
              <CalendarDays size={30} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-[#061b31]">
              Aucune réservation trouvée
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Les réservations correspondant à votre recherche apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
              />
            ))}
          </div>
        )}

        {/* PAGINATION */}

        {!loading && totalPages > 1 && (
          <div className="mt-7 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              disabled={page <= 1}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#061b31] transition hover:border-[#533afd]/30 hover:bg-[#533afd]/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
              Précédent
            </button>

            <span className="text-sm font-semibold text-slate-500">
              {page} / {totalPages}
            </span>

            <button
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              disabled={page >= totalPages}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#061b31] transition hover:border-[#533afd]/30 hover:bg-[#533afd]/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
              <ChevronRight size={17} />
            </button>
          </div>
        )}

        {/* INFORMATION SUR LA CONFIRMATION */}

        <div className="mt-8 rounded-2xl border border-[#533afd]/10 bg-[#533afd]/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-2 text-[#533afd] shadow-sm">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h3 className="font-bold text-[#061b31]">
                Confirmation des prestations
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Après avoir effectué une prestation, vous pourrez scanner le
                QR code du client et confirmer sa présence. Le montant sera
                alors transféré de votre solde en attente vers votre solde
                disponible.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FENÊTRE DU SCANNER QR */}

      {scannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061b31]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* EN-TÊTE DU SCANNER */}

            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-[#061b31]">
                  Scanner le QR code
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Placez le QR code du client devant la caméra.
                </p>
              </div>

              <button
                onClick={closeScanner}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#061b31]"
                aria-label="Fermer le scanner"
              >
                <X size={20} />
              </button>
            </div>

            {/* CAMÉRA */}

            <div className="p-5">
              <div className="relative overflow-hidden rounded-xl bg-[#061b31]">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-2xl border-2 border-[#8b7aff] shadow-[0_0_0_999px_rgba(6,27,49,0.35)]" />
                </div>
              </div>

              {/* DÉMARRAGE */}

              {scannerLoading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
                  <RefreshCw
                    size={17}
                    className="animate-spin text-[#533afd]"
                  />
                  Démarrage de la caméra...
                </div>
              )}

              {/* ERREUR CAMÉRA */}

              {scannerError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <p>{scannerError}</p>
                  </div>
                </div>
              )}

              {/* INSTRUCTIONS */}

              {!scannerError && (
                <p className="mt-4 text-center text-sm leading-6 text-slate-500">
                  Placez le QR code du client dans le cadre. Le scan
                  déclenchera automatiquement la vérification de la réservation
                  et de son paiement.
                </p>
              )}

              {/* FERMETURE */}

              <button
                onClick={closeScanner}
                className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#061b31] transition hover:bg-slate-50"
              >
                Fermer le scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// CARTE STATISTIQUE
// ======================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}
      >
        <Icon size={20} />
      </div>

      <p className="text-2xl font-bold text-[#061b31]">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

// ======================================================
// CARTE RÉSERVATION
// ======================================================

function BookingCard({ booking }: { booking: Booking }) {
  const config = statusConfig[booking.status];
  const StatusIcon = config.icon;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:border-[#533afd]/20 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex flex-col gap-4 p-4 sm:p-5">

        {/* RÉFÉRENCE ET STATUT */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Référence
            </p>

            <p className="mt-1 font-bold text-[#533afd]">
              {booking.reference}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.color}`}
          >
            <StatusIcon size={14} />
            {config.label}
          </span>
        </div>

        <div className="h-px bg-slate-100" />

        {/* INFORMATIONS PRINCIPALES */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {/* CLIENT */}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Client
            </p>

            <div className="flex items-center gap-2">
              <User
                size={17}
                className="shrink-0 text-[#533afd]"
              />

              <span className="text-sm font-semibold text-[#061b31]">
                {booking.customerFirstName}{" "}
                {booking.customerLastName}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Phone
                size={15}
                className="shrink-0 text-slate-400"
              />

              {booking.customerPhone}
            </div>

            <div className="mt-3 flex items-center gap-2 break-all text-sm text-slate-500">
              <Mail
                size={15}
                className="shrink-0 text-slate-400"
              />

              {booking.customerEmail}
            </div>
          </div>

          {/* PRESTATION */}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Prestation
            </p>

            <p className="text-sm font-semibold text-[#061b31]">
              {booking.service.name}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Quantité : {booking.quantity}
            </p>

            {booking.service.durationMinutes && (
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <Clock
                  size={15}
                  className="text-slate-400"
                />

                {booking.service.durationMinutes} minutes
              </p>
            )}
          </div>

          {/* DATE ET MONTANT */}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Date et montant
            </p>

            <p className="text-sm font-semibold text-[#061b31]">
              {formatDate(booking.startsAt)}
            </p>

            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Clock
                size={15}
                className="text-slate-400"
              />

              {formatTime(booking.startsAt)} –{" "}
              {formatTime(booking.endsAt)}
            </p>

            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-[#533afd]">
              <CreditCard size={15} />

              {formatAmount(
                booking.amount,
                booking.currency
              )}
            </p>
          </div>
        </div>

        {/* PAIEMENT */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Paiement
            </p>

            <p className="mt-1 text-sm font-semibold text-[#061b31]">
              {booking.payment?.status === "SUCCESS"
                ? "Paiement confirmé"
                : booking.payment?.status === "PENDING"
                  ? "Paiement en attente"
                  : booking.payment?.status === "FAILED"
                    ? "Paiement échoué"
                    : booking.payment
                      ? booking.payment.status
                      : "Aucun paiement enregistré"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-slate-400">
              Réservation créée le
            </p>

            <p className="mt-1 text-sm font-medium text-slate-600">
              {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}