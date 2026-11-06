"use client";

import { useEffect, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Send,
  Star,
} from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type Booking = {
  id: string;
  reference: string;
  completedAt: string | null;
  amount: number;
  currency: string;
  service: string;
  businessName: string;
  city: string;
  review: Review | null;
};

function formatDate(date: string | null) {
  if (!date) return "Date non disponible";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "XOF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ClientAvisPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState("");

  async function loadReviews() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/client/avis", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger vos avis.");
      }

      setBookings(data.bookings || []);
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

  useEffect(() => {
    loadReviews();
  }, []);

  async function submitReview(bookingId: string) {
    const rating = ratings[bookingId] || 0;
    const comment = comments[bookingId] || "";

    if (rating < 1 || rating > 5) {
      setError("Veuillez sélectionner une note entre 1 et 5 étoiles.");
      return;
    }

    try {
      setSubmitting(bookingId);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/client/avis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'enregistrer votre avis.");
      }

      setSuccessMessage("Merci ! Votre avis a bien été enregistré.");
      setSelectedBooking(null);

      await loadReviews();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setSubmitting(null);
    }
  }

  const reviewedBookings = bookings.filter(
    (booking) => booking.review !== null
  );

  const pendingBookings = bookings.filter(
    (booking) => booking.review === null
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* HEADER */}
      <div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <MessageSquareText size={24} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Mes avis
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Partagez votre expérience et aidez les autres clients à choisir
          leur établissement.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Avis publiés</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {reviewedBookings.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Avis à donner</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {pendingBookings.length}
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={20} />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-amber-500" size={30} />
        </div>
      ) : (
        <>
          {/* AVIS À DONNER */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                Donnez votre avis
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Ces prestations ont été réalisées. Vous pouvez maintenant
                partager votre expérience.
              </p>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white p-8 text-center">
                <MessageSquareText
                  className="mx-auto text-amber-400"
                  size={32}
                />
                <p className="mt-3 font-semibold text-zinc-800">
                  Aucun avis en attente
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Vos prochaines prestations terminées apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-amber-100 bg-white p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <h3 className="font-bold text-zinc-900">
                          {booking.businessName}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-600">
                          {booking.service}
                        </p>

                        <p className="mt-2 text-xs text-zinc-400">
                          Réservation {booking.reference}
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-sm font-semibold text-zinc-900">
                          {formatAmount(booking.amount, booking.currency)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Terminée le {formatDate(booking.completedAt)}
                        </p>
                      </div>
                    </div>

                    {selectedBooking === booking.id ? (
                      <div className="mt-5 border-t border-amber-100 pt-5">
                        <p className="text-sm font-semibold text-zinc-800">
                          Quelle note souhaitez-vous donner ?
                        </p>

                        <div className="mt-3 flex gap-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setRatings((current) => ({
                                  ...current,
                                  [booking.id]: value,
                                }))
                              }
                              aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                              className="transition hover:scale-110"
                            >
                              <Star
                                size={30}
                                className={
                                  value <= (ratings[booking.id] || 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-zinc-300"
                                }
                              />
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={comments[booking.id] || ""}
                          onChange={(event) =>
                            setComments((current) => ({
                              ...current,
                              [booking.id]: event.target.value,
                            }))
                          }
                          maxLength={1000}
                          rows={4}
                          placeholder="Racontez votre expérience (facultatif)..."
                          className="mt-4 w-full resize-none rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        />

                        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(null)}
                            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                          >
                            Annuler
                          </button>

                          <button
                            type="button"
                            disabled={submitting === booking.id}
                            onClick={() => submitReview(booking.id)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {submitting === booking.id ? (
                              <Loader2 size={17} className="animate-spin" />
                            ) : (
                              <Send size={16} />
                            )}
                            Publier mon avis
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(booking.id);
                          setError("");
                          setSuccessMessage("");
                        }}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 sm:w-auto"
                      >
                        <Star size={17} />
                        Donner mon avis
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AVIS DÉJÀ PUBLIÉS */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                Mes avis publiés
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Retrouvez les avis que vous avez déjà laissés.
              </p>
            </div>

            {reviewedBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
                <MessageSquareText
                  className="mx-auto text-zinc-300"
                  size={32}
                />
                <p className="mt-3 font-semibold text-zinc-800">
                  Aucun avis publié
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Vos avis apparaîtront ici après leur publication.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <h3 className="font-bold text-zinc-900">
                          {booking.businessName}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          {booking.service}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={17}
                            className={
                              index < (booking.review?.rating || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-zinc-200"
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {booking.review?.comment && (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                        {booking.review.comment}
                      </p>
                    )}

                    <p className="mt-4 text-xs text-zinc-400">
                      Publié le {formatDate(booking.review?.createdAt || null)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}