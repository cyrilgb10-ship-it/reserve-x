"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Ticket,
  CalendarDays,
  Clock3,
  MapPin,
  QrCode,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

// ======================================================
// TYPES
// ======================================================

type TicketData = {
  id: string;
  reference: string;
  startsAt: string;
  endsAt: string | null;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  qrCode: string | null;
  qrAlreadyUsed: boolean;
  createdAt: string;

  service: {
    name: string;
  };

  profile: {
    businessName: string;
    city: string;
    address: string | null;
  };

  payment: {
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
    verifiedAt: string | null;
  } | null;
};

type FilterType = "ALL" | "VALID" | "USED" | "OTHER";

// ======================================================
// HELPERS
// ======================================================

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Africa/Lome",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lome",
  }).format(new Date(value));
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " " + currency;
}

function getStatus(status: string, qrAlreadyUsed: boolean) {
  if (qrAlreadyUsed) {
    return {
      label: "Ticket utilisé",
      color: "bg-blue-50 text-blue-700 border-blue-100",
      icon: CheckCircle2,
    };
  }

  switch (status) {
    case "CONFIRMED":
      return {
        label: "Confirmé",
        color: "bg-green-50 text-green-700 border-green-100",
        icon: CheckCircle2,
      };

    case "COMPLETED":
      return {
        label: "Prestation terminée",
        color: "bg-blue-50 text-blue-700 border-blue-100",
        icon: CheckCircle2,
      };

    case "PENDING_PAYMENT":
      return {
        label: "En attente de paiement",
        color: "bg-amber-50 text-amber-700 border-amber-100",
        icon: Clock3,
      };

    case "CANCELLED":
      return {
        label: "Annulé",
        color: "bg-red-50 text-red-700 border-red-100",
        icon: XCircle,
      };

    case "EXPIRED":
      return {
        label: "Expiré",
        color: "bg-zinc-100 text-zinc-600 border-zinc-200",
        icon: AlertCircle,
      };

    case "REFUNDED":
      return {
        label: "Remboursé",
        color: "bg-purple-50 text-purple-700 border-purple-100",
        icon: AlertCircle,
      };

    default:
      return {
        label: status,
        color: "bg-zinc-100 text-zinc-600 border-zinc-200",
        icon: AlertCircle,
      };
  }
}

// ======================================================
// PAGE
// ======================================================

export default function ClientTicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ====================================================
  // CHARGEMENT DES TICKETS
  // ====================================================

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/client/tickets", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de récupérer vos tickets."
        );
      }

      const receivedTickets: TicketData[] = data.tickets || [];

      setTickets(receivedTickets);

      // Génération des QR codes
      const images: Record<string, string> = {};

      await Promise.all(
        receivedTickets.map(async (ticket) => {
          if (!ticket.qrCode) return;

          try {
            images[ticket.id] = await QRCode.toDataURL(
              ticket.qrCode,
              {
                width: 280,
                margin: 2,
                errorCorrectionLevel: "H",
                color: {
                  dark: "#18181B",
                  light: "#FFFFFF",
                },
              }
            );
          } catch (error) {
            console.error("Erreur génération QR :", error);
          }
        })
      );

      setQrImages(images);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // ====================================================
  // FILTRES
  // ====================================================

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === "ALL") return true;

    if (filter === "VALID") {
      return (
        ticket.qrCode !== null &&
        !ticket.qrAlreadyUsed &&
        ticket.status === "CONFIRMED"
      );
    }

    if (filter === "USED") {
      return ticket.qrAlreadyUsed;
    }

    return (
      ticket.status === "PENDING_PAYMENT" ||
      ticket.status === "CANCELLED" ||
      ticket.status === "EXPIRED" ||
      ticket.status === "REFUNDED"
    );
  });

  const validCount = tickets.filter(
    (ticket) =>
      ticket.qrCode &&
      !ticket.qrAlreadyUsed &&
      ticket.status === "CONFIRMED"
  ).length;

  const usedCount = tickets.filter(
    (ticket) => ticket.qrAlreadyUsed
  ).length;

  // ====================================================
  // COPIER LA RÉFÉRENCE
  // ====================================================

  async function copyReference(reference: string, id: string) {
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch {
      setError("Impossible de copier la référence.");
    }
  }

  // ====================================================
  // RENDU
  // ====================================================

  return (
    <div className="mx-auto max-w-6xl space-y-8">

      {/* EN-TÊTE */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-600">
            <Ticket size={16} />
            Mon espace client
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Mes tickets
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Retrouvez vos réservations et présentez vos QR codes aux établissements.
          </p>
        </div>

        <button
          onClick={loadTickets}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Actualiser
        </button>
      </div>

      {/* STATISTIQUES */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              Total des tickets
            </span>
            <Ticket className="text-amber-500" size={20} />
          </div>

          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {tickets.length}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              Tickets disponibles
            </span>
            <CheckCircle2 className="text-green-600" size={20} />
          </div>

          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {validCount}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              Tickets utilisés
            </span>
            <QrCode className="text-blue-600" size={20} />
          </div>

          <p className="mt-3 text-3xl font-bold text-zinc-900">
            {usedCount}
          </p>
        </div>

      </div>

      {/* FILTRES */}

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
        {[
          { id: "ALL", label: "Tous" },
          { id: "VALID", label: "Disponibles" },
          { id: "USED", label: "Utilisés" },
          { id: "OTHER", label: "Autres" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id as FilterType)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === item.id
                ? "bg-amber-500 text-white"
                : "bg-white text-zinc-600 hover:bg-amber-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ERREUR */}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* CHARGEMENT */}

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20">
          <Loader2 className="animate-spin text-amber-500" size={32} />
          <p className="mt-4 text-sm text-zinc-500">
            Chargement de vos tickets...
          </p>
        </div>
      ) : filteredTickets.length === 0 ? (

        /* AUCUN TICKET */

        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <Ticket size={30} className="text-amber-500" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-zinc-900">
            {tickets.length === 0
              ? "Vous n'avez pas encore de ticket"
              : "Aucun ticket dans cette catégorie"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            {tickets.length === 0
              ? "Vos tickets apparaîtront ici après vos réservations et la confirmation de vos paiements."
              : "Essayez de sélectionner une autre catégorie."}
          </p>

          {tickets.length === 0 && (
            <a
              href="/recherche"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
            >
              Explorer les établissements
            </a>
          )}
        </div>

      ) : (

        /* LISTE DES TICKETS */

        <div className="space-y-5">
          {filteredTickets.map((ticket) => {
            const status = getStatus(
              ticket.status,
              ticket.qrAlreadyUsed
            );

            const StatusIcon = status.icon;

            return (
              <article
                key={ticket.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
              >
                <div className="grid md:grid-cols-[1fr_280px]">

                  {/* INFORMATIONS */}

                  <div className="p-5 sm:p-7">

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                        {ticket.service.name}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.color}`}
                      >
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-bold text-zinc-900">
                      {ticket.profile.businessName}
                    </h2>

                    <div className="mt-5 space-y-3 text-sm text-zinc-600">

                      <div className="flex items-center gap-3">
                        <CalendarDays
                          size={17}
                          className="shrink-0 text-amber-500"
                        />
                        <span>{formatDate(ticket.startsAt)}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock3
                          size={17}
                          className="shrink-0 text-amber-500"
                        />
                        <span>
                          {formatTime(ticket.startsAt)}
                          {ticket.endsAt
                            ? ` – ${formatTime(ticket.endsAt)}`
                            : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin
                          size={17}
                          className="shrink-0 text-amber-500"
                        />
                        <span>
                          {ticket.profile.address
                            ? `${ticket.profile.address}, `
                            : ""}
                          {ticket.profile.city}
                        </span>
                      </div>

                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-5">

                      <div>
                        <p className="text-xs text-zinc-400">
                          Montant payé / réservé
                        </p>
                        <p className="mt-1 font-bold text-zinc-900">
                          {formatAmount(ticket.amount, ticket.currency)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-400">
                          Quantité
                        </p>
                        <p className="mt-1 font-bold text-zinc-900">
                          {ticket.quantity}
                        </p>
                      </div>

                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        Référence :
                      </span>

                      <span className="font-mono text-xs font-bold text-zinc-700">
                        {ticket.reference}
                      </span>

                      <button
                        onClick={() =>
                          copyReference(ticket.reference, ticket.id)
                        }
                        className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                        title="Copier la référence"
                      >
                        {copiedId === ticket.id ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>

                  </div>

                  {/* QR CODE */}

                  <div className="flex flex-col items-center justify-center border-t border-zinc-200 bg-[#FFFBF2] p-6 md:border-l md:border-t-0">

                    {ticket.qrCode && qrImages[ticket.id] ? (
                      <>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <img
                            src={qrImages[ticket.id]}
                            alt={`QR code du ticket ${ticket.reference}`}
                            className={`h-48 w-48 ${
                              ticket.qrAlreadyUsed
                                ? "opacity-40 grayscale"
                                : ""
                            }`}
                          />
                        </div>

                        {ticket.qrAlreadyUsed ? (
                          <p className="mt-4 text-center text-sm font-semibold text-blue-700">
                            Ce QR code a déjà été utilisé.
                          </p>
                        ) : (
                          <>
                            <p className="mt-4 text-center text-sm font-bold text-zinc-800">
                              Présentez ce QR code
                            </p>

                            <p className="mt-1 text-center text-xs leading-5 text-zinc-500">
                              À l'entrée de l'établissement pour valider votre ticket.
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
                          <QrCode size={30} className="text-zinc-300" />
                        </div>

                        <p className="mt-4 text-sm font-bold text-zinc-700">
                          QR code indisponible
                        </p>

                        <p className="mt-2 max-w-[210px] text-xs leading-5 text-zinc-500">
                          {ticket.status === "PENDING_PAYMENT"
                            ? "Votre QR code sera disponible après confirmation du paiement."
                            : "Ce ticket ne possède pas de QR code disponible."}
                        </p>
                      </div>
                    )}

                  </div>

                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}