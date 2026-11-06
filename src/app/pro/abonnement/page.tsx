"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
  Smartphone,
} from "lucide-react";

// ======================================================
// TYPES
// ======================================================

type Subscription = {
  id: string;
  plan: string;
  status: string;
  amount: number;
  startsAt: string;
  expiresAt: string;
};

type Payment = {
  id: string;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: string;
  network: string | null;
  customerPhone?: string | null;
  paidAt: string | null;
  verifiedAt?: string | null;
  createdAt: string;
};

type PendingPayment = {
  id: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  network: string | null;
  customerPhone?: string | null;
  status: string;
  createdAt: string;
};

type SubscriptionData = {
  success: boolean;

  profile?: {
    id: string;
    businessName: string;
  };

  pricing: {
    amount: number;
    currency: string;
    durationDays: number;
  };

  subscription: Subscription | null;

  upcomingSubscription: Subscription | null;

  subscriptions: Subscription[];

  pendingPayment: PendingPayment | null;

  paymentHistory: Payment[];

  payments?: Payment[];

  daysRemaining: number;

  isActive: boolean;

  isTrial: boolean;
};

// ======================================================
// OUTILS
// ======================================================

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Non disponible";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getPaymentStatus(status: string) {
  switch (status) {
    case "SUCCESS":
      return {
        label: "Payé",
        color: "bg-emerald-50 text-emerald-700",
      };

    case "PENDING":
      return {
        label: "En attente",
        color: "bg-amber-50 text-amber-700",
      };

    case "FAILED":
      return {
        label: "Échec",
        color: "bg-red-50 text-red-700",
      };

    case "CANCELLED":
      return {
        label: "Annulé",
        color: "bg-slate-100 text-slate-600",
      };

    case "REFUNDED":
      return {
        label: "Remboursé",
        color: "bg-slate-100 text-slate-600",
      };

    default:
      return {
        label: status,
        color: "bg-slate-100 text-slate-600",
      };
  }
}

// ======================================================
// PAGE ABONNEMENT
// ======================================================

export default function AbonnementPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);

  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState("moov_tg");
  const [phone, setPhone] = useState("");

  const [paying, setPaying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pollingRef = useRef(false);

  // ====================================================
  // RÉCUPÉRATION DES INFORMATIONS
  // ====================================================

  const loadSubscription = useCallback(
    async (silent = false) => {
      try {
        const response = await fetch("/api/pro/abonnement", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Impossible de récupérer votre abonnement."
          );
        }

        setData(result);

        // Paiement confirmé automatiquement.
        if (
          result.subscription &&
          !data?.subscription &&
          !result.pendingPayment
        ) {
          setSuccess(
            "Paiement confirmé ! Votre abonnement est maintenant activé."
          );
        }

        return result as SubscriptionData;
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error
              ? err.message
              : "Une erreur est survenue."
          );
        }

        return null;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [data?.subscription]
  );

  // ====================================================
  // CHARGEMENT INITIAL
  // ====================================================

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  // ====================================================
  // SYNCHRONISATION AUTOMATIQUE SASPAY
  // ====================================================

  useEffect(() => {
    if (!data?.pendingPayment) {
      return;
    }

    const interval = window.setInterval(async () => {
      if (pollingRef.current) {
        return;
      }

      pollingRef.current = true;

      try {
        await loadSubscription(true);
      } finally {
        pollingRef.current = false;
      }
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [data?.pendingPayment?.id, loadSubscription]);

  // ====================================================
  // ACTUALISATION MANUELLE
  // ====================================================

  async function refreshSubscription() {
    setLoading(true);
    setError("");
    setSuccess("");

    await loadSubscription();
  }

  // ====================================================
  // INITIALISATION DU PAIEMENT
  // ====================================================

  async function handlePayment() {
    setError("");
    setSuccess("");

    if (data?.pendingPayment) {
      setError(
        "Un paiement est déjà en cours. Reserve X vérifie automatiquement son statut."
      );
      return;
    }

    // Nettoyage du numéro.
    const cleanPhone = phone
      .trim()
      .replace(/[\s().-]/g, "");

    if (!cleanPhone) {
      setError(
        "Veuillez renseigner votre numéro Mobile Money."
      );
      return;
    }

    if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
      setError(
        "Veuillez saisir un numéro de téléphone valide."
      );
      return;
    }

    setPaying(true);

    try {
      const response = await fetch("/api/pro/abonnement", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          network,
          phone: cleanPhone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Impossible d'initialiser le paiement."
        );
      }

      // Redirection si SasPay fournit une URL.
      if (result.payment?.checkoutUrl) {
        window.location.assign(
          result.payment.checkoutUrl
        );

        return;
      }

      // Demande envoyée sur le téléphone.
      setSuccess(
        result.message ||
          `Demande de paiement envoyée au ${cleanPhone}. Consultez votre téléphone pour confirmer l'opération.`
      );

      // Actualisation immédiate.
      await loadSubscription();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );

      // Récupérer l'état réel du paiement.
      await loadSubscription();
    } finally {
      setPaying(false);
    }
  }

  // ====================================================
  // CHARGEMENT
  // ====================================================

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="animate-spin text-[#533afd]"
          size={32}
        />
      </div>
    );
  }

  // ====================================================
  // ERREUR DE CHARGEMENT
  // ====================================================

  if (!data) {
    return (
      <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
        <XCircle
          className="mx-auto text-red-500"
          size={32}
        />

        <p className="mt-4 font-semibold text-[#061b31]">
          Impossible de charger votre abonnement.
        </p>

        <button
          onClick={refreshSubscription}
          className="mt-5 rounded-lg bg-[#533afd] px-5 py-3 text-sm font-semibold text-white"
        >
          Réessayer
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ====================================================
  // DONNÉES
  // ====================================================

  const subscription = data.subscription;

  const upcomingSubscription = data.upcomingSubscription;

  const pendingPayment = data.pendingPayment;

  const paymentHistory = data.paymentHistory ?? [];

  const isActive = data.isActive;

  const isTrial = data.isTrial;

  // ====================================================
  // AFFICHAGE
  // ====================================================

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">

      {/* EN-TÊTE */}

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

        <div>
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#533afd]">
            Gestion du compte
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#061b31]">
            Mon abonnement
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gérez votre accès aux services Reserve X.
          </p>
        </div>

        <button
          onClick={refreshSubscription}
          disabled={loading || paying}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-[#061b31] transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          Actualiser
        </button>

      </div>

      {/* MESSAGES */}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle
            size={19}
            className="shrink-0"
          />

          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={19}
            className="shrink-0"
          />

          {success}
        </div>
      )}

      {/* ABONNEMENT ACTUEL */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="flex flex-col justify-between gap-5 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:p-8">

          <div>
            <div className="flex items-center gap-2">

              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#533afd]/10 text-[#533afd]">
                <BadgeCheck size={22} />
              </span>

              <span className="text-sm font-semibold text-slate-500">
                Votre formule
              </span>

            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#061b31]">
              Reserve X
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Accédez à votre espace professionnel.
            </p>
          </div>

          <div>
            {isActive ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={15} />

                {isTrial
                  ? "Période d'essai active"
                  : "Abonnement actif"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
                <XCircle size={15} />

                Abonnement inactif
              </span>
            )}
          </div>

        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">

          {/* TARIF */}

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Wallet size={16} />
              Tarif
            </div>

            <p className="mt-3 text-xl font-bold text-[#061b31]">
              {isTrial
                ? "Gratuit"
                : formatPrice(
                    subscription?.amount ?? data.pricing.amount
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {isTrial
                ? "Période d'essai"
                : "Pour 30 jours"}
            </p>
          </div>

          {/* EXPIRATION */}

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <CalendarDays size={16} />
              Expiration
            </div>

            <p className="mt-3 text-base font-bold text-[#061b31]">
              {formatDate(subscription?.expiresAt)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Date de fin de validité
            </p>
          </div>

          {/* TEMPS RESTANT */}

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Clock3 size={16} />
              Temps restant
            </div>

            <p className="mt-3 text-xl font-bold text-[#061b31]">
              {data.daysRemaining} jours
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Avant expiration
            </p>
          </div>

        </div>

        {upcomingSubscription && (
          <div className="border-t border-slate-100 bg-slate-50 p-5">

            <p className="text-sm font-semibold text-[#061b31]">
              Prochaine période
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Votre prochain abonnement commencera le{" "}
              {formatDate(upcomingSubscription.startsAt)}.
            </p>

          </div>
        )}

      </section>

      {/* OFFRE ET PAIEMENT */}

      <section className="grid gap-6 lg:grid-cols-[1fr_350px]">

        {/* AVANTAGES */}

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">

          <div className="flex items-center gap-3">

            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#533afd]/10 text-[#533afd]">
              <ShieldCheck size={22} />
            </span>

            <div>
              <h2 className="text-lg font-bold text-[#061b31]">
                Votre accès Reserve X
              </h2>

              <p className="text-xs text-slate-400">
                Une formule unique pour tous les professionnels.
              </p>
            </div>

          </div>

          <div className="mt-7 space-y-4">

            {[
              "Page professionnelle publique",
              "Publication de vos prestations",
              "Réception des réservations",
              "Gestion de vos clients",
              "Validation des tickets QR",
              "Accès à votre portefeuille",
              "Suivi de vos revenus",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3"
              >
                <CheckCircle2
                  size={17}
                  className="shrink-0 text-emerald-500"
                />

                <span className="text-sm text-slate-600">
                  {feature}
                </span>
              </div>
            ))}

          </div>

        </div>

        {/* PAIEMENT */}

        <div className="rounded-xl border border-[#533afd]/20 bg-white p-6 sm:p-7">

          <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#533afd]">
            Offre professionnelle
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-tight text-[#061b31]">
            2 000

            <span className="ml-1 text-sm font-semibold text-slate-400">
              FCFA
            </span>
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Pour 30 jours d'accès.
          </p>

          <div className="my-6 border-t border-slate-100" />

          {/* OPÉRATEUR */}

          <label className="text-xs font-bold text-[#061b31]">
            Choisissez votre opérateur
          </label>

          <select
            value={network}
            onChange={(event) =>
              setNetwork(event.target.value)
            }
            disabled={paying || Boolean(pendingPayment)}
            className="mt-3 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-[#061b31] outline-none focus:border-[#533afd] disabled:bg-slate-50"
          >
            <option value="moov_tg">
              Moov Money
            </option>

            <option value="togocel">
              TMoney
            </option>
          </select>

          {/* NUMÉRO */}

          <label className="mt-5 block text-xs font-bold text-[#061b31]">
            Numéro Mobile Money de paiement
          </label>

          <div className="relative mt-3">

            <Smartphone
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Ex : 90 00 00 00"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              disabled={paying || Boolean(pendingPayment)}
              maxLength={18}
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-[#061b31] outline-none transition placeholder:text-slate-400 focus:border-[#533afd] disabled:bg-slate-50"
            />

          </div>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Saisissez le numéro sur lequel vous souhaitez
            recevoir la demande de paiement.
          </p>

          {/* PAIEMENT EN ATTENTE */}

          {pendingPayment && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">

              <div className="flex items-center gap-2">

                <Clock3
                  size={17}
                  className="text-amber-700"
                />

                <p className="text-sm font-bold text-amber-800">
                  Paiement en cours de vérification
                </p>

              </div>

              <p className="mt-2 text-xs leading-5 text-amber-700">
                Une demande de paiement est en cours.
                Reserve X vérifie automatiquement son statut
                auprès de SasPay toutes les 4 secondes.
              </p>

              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-800">
                <Loader2
                  size={14}
                  className="animate-spin"
                />

                Synchronisation automatique...
              </div>

              <p className="mt-3 text-xs text-amber-700">
                Montant : {formatPrice(pendingPayment.amount)}
              </p>

              <p className="mt-1 text-xs text-amber-700">
                Téléphone : {pendingPayment.customerPhone || "Non disponible"}
              </p>

            </div>
          )}

          {/* BOUTON DE PAIEMENT */}

          <button
            onClick={handlePayment}
            disabled={
              paying ||
              !phone.trim() ||
              Boolean(pendingPayment)
            }
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#533afd] px-4 text-sm font-bold text-white transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paying ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Initialisation en cours...
              </>
            ) : pendingPayment ? (
              <>
                <Clock3 size={17} />

                Paiement en attente
              </>
            ) : (
              <>
                {isActive
                  ? "Renouveler mon abonnement"
                  : "Activer mon abonnement"}

                <ArrowRight size={17} />
              </>
            )}
          </button>

          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
            Paiement sécurisé via SasPay.
            <br />
            Activation après confirmation du paiement.
          </p>

        </div>

      </section>

      {/* HISTORIQUE DES PAIEMENTS */}

      <section className="rounded-xl border border-slate-200 bg-white">

        <div className="flex items-center gap-3 border-b border-slate-100 p-6">

          <History
            size={20}
            className="text-[#533afd]"
          />

          <div>
            <h2 className="font-bold text-[#061b31]">
              Historique des paiements
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Consultez vos dernières transactions.
            </p>
          </div>

        </div>

        {paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">

                  <th className="px-6 py-4 text-xs font-bold text-slate-400">
                    Date
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-slate-400">
                    Opérateur
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-slate-400">
                    Montant
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-slate-400">
                    Statut
                  </th>

                </tr>
              </thead>

              <tbody>

                {paymentHistory.map((payment) => {
                  const status = getPaymentStatus(
                    payment.status
                  );

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-50 last:border-0"
                    >

                      <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">
                        {formatDate(payment.createdAt)}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {payment.network === "moov_tg"
                          ? "Moov Money"
                          : payment.network === "togocel"
                            ? "TMoney"
                            : payment.network || "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-sm font-bold text-[#061b31]">
                        {formatPrice(payment.amount)}
                      </td>

                      <td className="px-6 py-5">

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${status.color}`}
                        >
                          {status.label}
                        </span>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="px-6 py-14 text-center">

            <CreditCard
              size={30}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 text-sm font-semibold text-[#061b31]">
              Aucun paiement pour le moment.
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Vos transactions apparaîtront ici.
            </p>

          </div>
        )}

      </section>

      {/* INFORMATION */}

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">

        <ShieldCheck
          size={19}
          className="mt-0.5 shrink-0 text-[#533afd]"
        />

        <p className="text-xs leading-6 text-slate-500">
          Votre abonnement est personnel à votre établissement.
          Les paiements sont vérifiés auprès de SasPay avant
          toute activation. Votre historique de transactions
          reste accessible depuis cet espace.
        </p>

      </div>

    </div>
  );
}