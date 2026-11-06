"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  CreditCard,
  ArrowRight,
} from "lucide-react";

import MobileMenu from "@/components/pro/MobileMenu";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string;
  createdAt: string;
  booking: {
    reference: string;
    service: {
      name: string;
    };
  } | null;
};

type Withdrawal = {
  id: string;
  reference: string;
  amount: number;
  firstName: string;
  lastName: string;
  phone: string;
  operator: string;
  status: string;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
};

type WalletData = {
  id: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  updatedAt: string;
  transactions: Transaction[];
  withdrawals: Withdrawal[];
};

const transactionLabels: Record<string, string> = {
  BOOKING_REVENUE: "Paiement d'une réservation",
  WITHDRAWAL: "Demande de retrait",
  WITHDRAWAL_REFUND: "Remboursement de retrait",
  REFUND: "Remboursement",
  ADJUSTMENT: "Transfert / ajustement",
};

const withdrawalStatus: Record<
  string,
  { label: string; style: string }
> = {
  PENDING: {
    label: "En attente",
    style: "border-orange-200 bg-orange-50 text-orange-700",
  },
  PROCESSING: {
    label: "En traitement",
    style: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PAID: {
    label: "Payé",
    style: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    label: "Refusé",
    style: "border-red-200 bg-red-50 text-red-700",
  },
};

function formatAmount(amount: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} FCFA`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function transactionIsDebit(type: string) {
  return type === "WITHDRAWAL" || type === "REFUND";
}

export default function PortefeuilleManager() {
  const [wallet, setWallet] = useState<WalletData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [form, setForm] = useState({
    amount: "",
    firstName: "",
    lastName: "",
    phone: "",
    operator: "",
  });

  const loadWallet = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch("/api/pro/portefeuille", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de charger le portefeuille.",
        );
      }

      setWallet(data.wallet);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  async function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setFeedback("");

    const amount = Number(form.amount);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Veuillez saisir un montant valide.");
      return;
    }

    if (amount > (wallet?.availableBalance ?? 0)) {
      setError("Votre solde disponible est insuffisant.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/pro/portefeuille", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible d'enregistrer le retrait.",
        );
      }

      setFeedback(
        data.message || "Votre demande de retrait a été enregistrée.",
      );

      setForm((current) => ({
        ...current,
        amount: "",
      }));

      await loadWallet(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#061b31]">
      <MobileMenu />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">

        {/* EN-TÊTE */}

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#533afd]">
              <Wallet size={17} />
              Gestion financière
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Mon portefeuille
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Suivez vos revenus, vos disponibilités et vos demandes de retrait.
            </p>
          </div>

          <button
            onClick={() => void loadWallet(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#061b31] transition hover:border-[#533afd]/30 hover:bg-[#533afd]/5 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Actualiser
          </button>
        </div>

        {/* ERREUR */}

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertCircle size={19} className="shrink-0" />
            {error}
          </div>
        )}

        {/* CONFIRMATION */}

        {feedback && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            <CheckCircle2 size={19} className="shrink-0" />
            {feedback}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-24 text-center">
            <RefreshCw
              size={30}
              className="mx-auto animate-spin text-[#533afd]"
            />
            <p className="mt-4 text-sm text-slate-500">
              Chargement du portefeuille...
            </p>
          </div>
        ) : wallet ? (
          <>
            {/* SOLDES */}

            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <BalanceCard
                label="Solde disponible"
                amount={wallet.availableBalance}
                icon={Wallet}
                accent="violet"
              />

              <BalanceCard
                label="Solde en attente"
                amount={wallet.pendingBalance}
                icon={Clock3}
                accent="orange"
              />

              <BalanceCard
                label="Revenus générés"
                amount={wallet.totalEarned}
                icon={ArrowDownToLine}
                accent="emerald"
              />

              <BalanceCard
                label="Retraits effectués"
                amount={wallet.totalWithdrawn}
                icon={ArrowUpFromLine}
                accent="blue"
              />
            </div>

            {/* RETRAIT ET INFORMATIONS */}

            <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

              {/* FORMULAIRE DE RETRAIT */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                    <ArrowUpFromLine size={21} />
                  </div>

                  <div>
                    <h2 className="font-bold text-[#061b31]">
                      Effectuer un retrait
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Recevez vos revenus sur votre Mobile Money.
                    </p>
                  </div>
                </div>

                <div className="mb-5 rounded-xl border border-[#533afd]/10 bg-[#533afd]/5 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Disponible pour retrait
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#533afd]">
                    {formatAmount(wallet.availableBalance)}
                  </p>
                </div>

                <form
                  onSubmit={handleWithdrawal}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Montant à retirer (FCFA)
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      max={wallet.availableBalance}
                      required
                      value={form.amount}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          amount: event.target.value,
                        })
                      }
                      placeholder="Ex. 15000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Prénom
                      </label>

                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={form.firstName}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            firstName: event.target.value,
                          })
                        }
                        placeholder="Votre prénom"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Nom
                      </label>

                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={form.lastName}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            lastName: event.target.value,
                          })
                        }
                        placeholder="Votre nom"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Numéro Mobile Money
                    </label>

                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: event.target.value,
                        })
                      }
                      placeholder="+228 XX XX XX XX"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Opérateur Mobile Money
                    </label>

                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={form.operator}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          operator: event.target.value,
                        })
                      }
                      placeholder="Ex. Moov Money, TMoney..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#533afd] focus:bg-white focus:ring-4 focus:ring-[#533afd]/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || wallet.availableBalance <= 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#533afd] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        Envoyer ma demande
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />

                  <p>
                    Les demandes sont vérifiées par l'administration.
                    Le transfert Mobile Money est effectué manuellement
                    après validation de votre demande.
                  </p>
                </div>
              </section>

              {/* INFORMATIONS */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CreditCard size={21} />
                  </div>

                  <div>
                    <h2 className="font-bold text-[#061b31]">
                      Fonctionnement du portefeuille
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Comprendre vos revenus.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <InfoItem
                    number="01"
                    title="Paiement confirmé"
                    description="Lorsqu'un client paie une réservation, le montant rejoint votre solde en attente."
                  />

                  <InfoItem
                    number="02"
                    title="Prestation effectuée"
                    description="Vous scannez le QR code du client et confirmez que la prestation a été réalisée."
                  />

                  <InfoItem
                    number="03"
                    title="Argent disponible"
                    description="Le montant est transféré vers votre solde disponible après validation du ticket."
                  />

                  <InfoItem
                    number="04"
                    title="Retrait Mobile Money"
                    description="Vous demandez un retrait. L'administration effectue le transfert et met à jour son statut."
                  />
                </div>

                <div className="mt-7 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-[#061b31]">
                    Dernière mise à jour du portefeuille
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {formatDate(wallet.updatedAt)}
                  </p>
                </div>
              </section>
            </div>

            {/* DEMANDES DE RETRAIT */}

            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ArrowUpFromLine size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-[#061b31]">
                    Mes demandes de retrait
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Suivez le traitement de vos demandes.
                  </p>
                </div>
              </div>

              {wallet.withdrawals.length === 0 ? (
                <EmptyState
                  title="Aucune demande de retrait"
                  description="Vos demandes de retrait apparaîtront ici."
                />
              ) : (
                <div className="space-y-3">
                  {wallet.withdrawals.map((withdrawal) => {
                    const status =
                      withdrawalStatus[withdrawal.status] ??
                      withdrawalStatus.PENDING;

                    return (
                      <div
                        key={withdrawal.id}
                        className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="font-bold text-[#061b31]">
                            {formatAmount(withdrawal.amount)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {withdrawal.operator} · {withdrawal.phone}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {withdrawal.reference} ·{" "}
                            {formatDate(withdrawal.createdAt)}
                          </p>

                          {withdrawal.adminNote && (
                            <p className="mt-2 text-xs text-slate-600">
                              Note : {withdrawal.adminNote}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.style}`}
                          >
                            {withdrawal.status === "PAID" ? (
                              <CheckCircle2 size={13} />
                            ) : withdrawal.status === "REJECTED" ? (
                              <XCircle size={13} />
                            ) : (
                              <Clock3 size={13} />
                            )}

                            {status.label}
                          </span>

                          {withdrawal.processedAt && (
                            <p className="text-xs text-slate-400">
                              Traité le {formatDate(withdrawal.processedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* HISTORIQUE */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#533afd]/10 text-[#533afd]">
                  <History size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-[#061b31]">
                    Historique des transactions
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Les 30 dernières opérations de votre portefeuille.
                  </p>
                </div>
              </div>

              {wallet.transactions.length === 0 ? (
                <EmptyState
                  title="Aucune transaction"
                  description="Vos opérations financières apparaîtront ici."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {wallet.transactions.map((transaction) => {
                    const isDebit = transactionIsDebit(transaction.type);

                    return (
                      <div
                        key={transaction.id}
                        className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isDebit
                                ? "bg-orange-50 text-orange-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {isDebit ? (
                              <ArrowUpFromLine size={18} />
                            ) : (
                              <ArrowDownToLine size={18} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#061b31]">
                              {transactionLabels[transaction.type] ??
                                transaction.type}
                            </p>

                            <p className="mt-1 break-words text-xs text-slate-500">
                              {transaction.description ||
                                transaction.booking?.service.name ||
                                "Opération portefeuille"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {transaction.booking?.reference
                                ? `${transaction.booking.reference} · `
                                : ""}
                              {formatDate(transaction.createdAt)}
                            </p>
                          </div>
                        </div>

                        <p
                          className={`text-sm font-bold sm:text-right ${
                            isDebit
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {isDebit ? "−" : "+"}
                          {formatAmount(transaction.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <EmptyState
            title="Portefeuille indisponible"
            description="Impossible de récupérer les informations de votre portefeuille."
          />
        )}
      </main>
    </div>
  );
}

// ======================================================
// CARTE DE SOLDE
// ======================================================

function BalanceCard({
  label,
  amount,
  icon: Icon,
  accent,
}: {
  label: string;
  amount: number;
  icon: typeof Wallet;
  accent: "violet" | "orange" | "emerald" | "blue";
}) {
  const styles = {
    violet: "bg-[#533afd]/10 text-[#533afd]",
    orange: "bg-orange-50 text-orange-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#533afd]/20 sm:p-6">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${styles[accent]}`}
      >
        <Icon size={21} />
      </div>

      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-2xl font-bold tracking-tight text-[#061b31]">
        {formatAmount(amount)}
      </p>
    </div>
  );
}

// ======================================================
// INFORMATIONS DU PORTEFEUILLE
// ======================================================

function InfoItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#533afd]/10 text-xs font-bold text-[#533afd]">
        {number}
      </div>

      <div>
        <h3 className="text-sm font-bold text-[#061b31]">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

// ======================================================
// ÉTAT VIDE
// ======================================================

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
      <Wallet
        size={27}
        className="mx-auto text-slate-300"
      />

      <h3 className="mt-4 text-sm font-bold text-[#061b31]">
        {title}
      </h3>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}