"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
  User,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";

type CustomField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
};

type ServiceData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  capacity: number;
  category: string;

  profile: {
    businessName: string;
    address: string | null;
    city: string;
    country: string;
  };

  customFields: CustomField[];
};

type CustomerData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type Props = {
  service: ServiceData;
  customer: CustomerData;
};

type BookingData = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
};

type PaymentData = {
  id: string;
  status: string;
  checkoutUrl?: string | null;
};

function formatAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency}`;
}

function isMultiDay(category: string) {
  return category === "HOTEL" || category === "VEHICLE";
}

function getDateDifference(start: string, end: string) {
  if (!start || !end) return 0;

  const startDate = new Date(`${start}T00:00:00+00:00`);
  const endDate = new Date(`${end}T00:00:00+00:00`);

  const difference = endDate.getTime() - startDate.getTime();

  return Math.floor(difference / (24 * 60 * 60 * 1000));
}

function getErrorMessage(data: any, fallback: string) {
  return typeof data?.error === "string"
    ? data.error
    : typeof data?.message === "string"
      ? data.message
      : fallback;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function ReservationForm({
  service,
  customer,
}: Props) {
  const router = useRouter();

  const multiDay = isMultiDay(service.category);

  // ==================================================
  // CLIENT
  // ==================================================

  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone);

  // ==================================================
  // RÉSERVATION
  // ==================================================

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");

  const [endDate, setEndDate] = useState("");

  const [quantity, setQuantity] = useState(1);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // ==================================================
  // PAIEMENT
  // ==================================================

  const [network, setNetwork] = useState<"moov_tg" | "togocel">("moov_tg");

  // Numéro Mobile Money à débiter
  const [paymentPhone, setPaymentPhone] = useState(customer.phone);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [paymentId, setPaymentId] = useState("");

  const [paymentStatus, setPaymentStatus] = useState<
    "IDLE" | "PENDING" | "SUCCESS" | "FAILED"
  >("IDLE");

  // ==================================================
  // ÉTATS
  // ==================================================

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [step, setStep] = useState<"FORM" | "PAYMENT">("FORM");

  const today = new Date().toISOString().slice(0, 10);

  const days = multiDay
    ? getDateDifference(date, endDate)
    : 1;

  const estimatedAmount =
    service.price * quantity * (multiDay ? Math.max(days, 0) : 1);

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10";

  // ==================================================
  // CHAMPS PERSONNALISÉS
  // ==================================================

  function updateField(id: string, value: string) {
    setFieldValues((previous) => ({
      ...previous,
      [id]: value,
    }));
  }

  function renderCustomField(field: CustomField) {
    const value = fieldValues[field.id] ?? "";

    return (
      <div key={field.id}>
        <label className="mb-2 block text-sm font-semibold text-zinc-800">
          {field.label}

          {field.required && (
            <span className="ml-1 text-red-500">*</span>
          )}
        </label>

        {field.type === "SELECT" ? (
          <select
            required={field.required}
            value={value}
            onChange={(event) =>
              updateField(field.id, event.target.value)
            }
            className={inputClass}
          >
            <option value="">Sélectionnez une option</option>

            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : field.type === "CHECKBOX" ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(event) =>
                updateField(
                  field.id,
                  event.target.checked ? "true" : "false"
                )
              }
              className="h-4 w-4 accent-orange-500"
            />

            <span className="text-sm text-zinc-700">
              {field.label}
            </span>
          </label>
        ) : (
          <input
            type={
              field.type === "NUMBER"
                ? "number"
                : field.type === "EMAIL"
                  ? "email"
                  : field.type === "PHONE"
                    ? "tel"
                    : "text"
            }
            required={field.required}
            value={value}
            onChange={(event) =>
              updateField(field.id, event.target.value)
            }
            className={inputClass}
            placeholder={`Renseignez ${field.label.toLowerCase()}`}
          />
        )}
      </div>
    );
  }

  // ==================================================
  // VÉRIFICATION DU PAIEMENT
  // ==================================================

  async function verifyPayment(id: string, automatic = false) {
    setPaymentId(id);
    setPaymentStatus("PENDING");
    setError("");
    setNotice(
      "Nous vérifions votre paiement. Cette opération peut prendre quelques instants."
    );

    setVerifying(true);

    try {
      const maxAttempts = automatic ? 45 : 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await fetch(
            `/api/payments/${encodeURIComponent(id)}/verify`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          const data = await response.json();

          const paymentState =
            data?.payment?.status ??
            data?.status ??
            data?.paymentStatus;

          const bookingState =
            data?.booking?.status ??
            data?.bookingStatus;

          const bookingConfirmed =
            data?.bookingConfirmed === true ||
            bookingState === "CONFIRMED";

          if (
            paymentState === "SUCCESS" &&
            bookingConfirmed
          ) {
            setPaymentStatus("SUCCESS");
            setNotice("Paiement confirmé ! Votre ticket est prêt.");

            await sleep(1200);

            router.push("/client/tickets");
            router.refresh();

            return;
          }

          if (
            paymentState === "FAILED" ||
            paymentState === "CANCELLED"
          ) {
            setPaymentStatus("FAILED");
            setNotice("");

            setError(
              "Le paiement n'a pas abouti. Vous pouvez effectuer une nouvelle tentative."
            );

            return;
          }

          if (
            paymentState === "SUCCESS" &&
            !bookingConfirmed
          ) {
            setPaymentStatus("PENDING");
            setNotice(
              "Le paiement a été signalé comme réussi, mais la confirmation de la réservation est encore en cours. Nous continuons la vérification."
            );
          }
        } catch {
          // Une erreur réseau temporaire ne signifie pas que le paiement a échoué.
        }

        if (attempt < maxAttempts - 1) {
          await sleep(4000);
        }
      }

      setNotice(
        "La vérification automatique est terminée. Si vous avez validé le paiement sur votre téléphone, vérifiez à nouveau son statut."
      );
    } finally {
      setVerifying(false);
    }
  }

  // ==================================================
  // CRÉATION DU PAIEMENT
  // ==================================================

  async function createPayment(bookingId: string) {
    setError("");
    setNotice("");

    const normalizedPaymentPhone = paymentPhone
      .trim()
      .replace(/[\s().-]/g, "");

    if (!/^\+?\d{6,15}$/.test(normalizedPaymentPhone)) {
      setError("Veuillez renseigner un numéro Mobile Money valide.");
      return;
    }

    setLoading(true);
    setNotice("Préparation de votre paiement...");

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          network,
          paymentPhone: normalizedPaymentPhone,
        }),
      });

      const data = await response.json();

      const returnedPaymentId =
        data?.payment?.id ??
        data?.paymentId ??
        "";

      if (returnedPaymentId) {
        setPaymentId(returnedPaymentId);
      }

      if (!response.ok) {
        if (returnedPaymentId) {
          setNotice(
            "La demande de paiement a peut-être été transmise. Vérifiez son statut avant de recommencer."
          );

          setLoading(false);

          await verifyPayment(returnedPaymentId, true);

          return;
        }

        throw new Error(
          getErrorMessage(
            data,
            "Impossible d'initialiser le paiement."
          )
        );
      }

      const payment: PaymentData | undefined = data.payment;

      if (!payment?.id) {
        throw new Error(
          "La réponse du serveur ne contient pas de référence de paiement."
        );
      }

      setPaymentId(payment.id);
      setPaymentStatus("PENDING");

      const checkoutUrl = payment.checkoutUrl;

      if (checkoutUrl) {
        let parsedUrl: URL;

        try {
          parsedUrl = new URL(checkoutUrl);
        } catch {
          throw new Error("Le lien de paiement reçu est invalide.");
        }

        if (parsedUrl.protocol !== "https:") {
          throw new Error("Le lien de paiement n'est pas sécurisé.");
        }

        setNotice("Redirection vers la page de paiement...");

        window.location.assign(parsedUrl.toString());

        return;
      }

      setLoading(false);

      await verifyPayment(payment.id, true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );

      setNotice("");
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // CRÉATION DE LA RÉSERVATION
  // ==================================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setNotice("");

    // Vérification du numéro Mobile Money avant toute création
    // de réservation ou de transaction de paiement.

    const normalizedPaymentPhone = paymentPhone
      .trim()
      .replace(/[\s().-]/g, "");

    if (!/^\+?\d{6,15}$/.test(normalizedPaymentPhone)) {
      setError("Veuillez renseigner un numéro Mobile Money valide.");
      return;
    }

    if (firstName.trim().length < 2) {
      setError("Veuillez renseigner un prénom valide.");
      return;
    }

    if (lastName.trim().length < 2) {
      setError("Veuillez renseigner un nom valide.");
      return;
    }

    if (!date) {
      setError("Veuillez sélectionner une date.");
      return;
    }

    if (multiDay && !endDate) {
      setError("Veuillez sélectionner une date de fin.");
      return;
    }

    if (multiDay && days <= 0) {
      setError("La date de fin doit être après la date de début.");
      return;
    }

    if (quantity < 1 || quantity > 100) {
      setError("La quantité doit être comprise entre 1 et 100.");
      return;
    }

    for (const field of service.customFields) {
      if (!field.required) continue;

      const value = fieldValues[field.id] ?? "";

      if (!value.trim()) {
        setError(`Le champ « ${field.label} » est obligatoire.`);
        return;
      }

      if (
        field.type === "CHECKBOX" &&
        value !== "true"
      ) {
        setError(`Veuillez accepter : ${field.label}.`);
        return;
      }
    }

    let startsAt: Date;
    let endsAt: Date | undefined;

    if (multiDay) {
      startsAt = new Date(`${date}T12:00:00+00:00`);
      endsAt = new Date(`${endDate}T12:00:00+00:00`);
    } else {
      startsAt = new Date(`${date}T${time}:00+00:00`);
    }

    if (
      Number.isNaN(startsAt.getTime()) ||
      (endsAt && Number.isNaN(endsAt.getTime()))
    ) {
      setError("La date ou l'heure sélectionnée est invalide.");
      return;
    }

    const amount = estimatedAmount;

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 100_000_000
    ) {
      setError("Le montant de la réservation est invalide.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: service.id,

          customerFirstName: firstName.trim(),
          customerLastName: lastName.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),

          startsAt: startsAt.toISOString(),

          ...(endsAt
            ? {
                endsAt: endsAt.toISOString(),
              }
            : {}),

          quantity,
          fieldValues,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Impossible d'enregistrer votre réservation."
          )
        );
      }

      if (!data.booking?.id) {
        throw new Error(
          "La réservation a été enregistrée, mais sa référence est absente."
        );
      }

      const newBooking: BookingData = {
        id: data.booking.id,
        reference: data.booking.reference,
        amount: data.booking.amount,
        currency: data.booking.currency,
      };

      setBooking(newBooking);
      setStep("PAYMENT");

      setLoading(false);

      await createPayment(newBooking.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );

      setLoading(false);
    }
  }

  // ==================================================
  // RENDU
  // ==================================================

  return (
    <div className="mx-auto max-w-5xl">

      {/* EN-TÊTE */}

      <div className="mb-8">
        <a
          href="/recherche"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-orange-600"
        >
          <ArrowLeft size={16} />
          Retour aux prestations
        </a>

        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-700">
            <Ticket size={14} />
            Réservation Reserve X
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {step === "FORM"
              ? "Réservez votre prestation"
              : "Finalisez votre paiement"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {step === "FORM"
              ? "Renseignez les informations nécessaires pour effectuer votre réservation."
              : "Votre réservation est enregistrée. Il ne reste plus qu'à confirmer le paiement."}
          </p>
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[1fr_340px]">

        {/* CONTENU PRINCIPAL */}

        <div className="space-y-6">

          {step === "FORM" ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* PRESTATION */}

              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Ticket size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      {service.profile.businessName}
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-zinc-900">
                      {service.name}
                    </h2>

                    {service.description && (
                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {service.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={15} className="text-orange-500" />
                        {service.profile.city}
                      </span>

                      {!multiDay && service.durationMinutes && (
                        <span className="inline-flex items-center gap-2">
                          <Clock3 size={15} className="text-orange-500" />
                          {service.durationMinutes} minutes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* INFORMATIONS CLIENT */}

              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-zinc-900">
                    Vos informations
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Ces informations seront associées à votre réservation.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Prénom *
                    </label>

                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                      <input
                        required
                        minLength={2}
                        maxLength={80}
                        value={firstName}
                        onChange={(event) =>
                          setFirstName(event.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="Votre prénom"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Nom *
                    </label>

                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                      <input
                        required
                        minLength={2}
                        maxLength={80}
                        value={lastName}
                        onChange={(event) =>
                          setLastName(event.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Adresse e-mail *
                    </label>

                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                      <input
                        required
                        type="email"
                        maxLength={150}
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="exemple@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Téléphone de contact *
                    </label>

                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                      <input
                        required
                        type="tel"
                        minLength={6}
                        maxLength={25}
                        value={phone}
                        onChange={(event) =>
                          setPhone(event.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="+228 90 00 00 00"
                      />
                    </div>

                    <p className="mt-2 text-xs text-zinc-400">
                      Ce numéro sera associé à vos informations de réservation.
                    </p>
                  </div>

                </div>
              </section>

              {/* DATE ET QUANTITÉ */}

              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <h2 className="text-lg font-bold text-zinc-900">
                  Date et disponibilité
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Choisissez les dates souhaitées pour votre réservation.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      {multiDay ? "Date de début *" : "Date souhaitée *"}
                    </label>

                    <div className="relative">
                      <CalendarDays className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                      <input
                        type="date"
                        required
                        min={today}
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  {multiDay ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Date de fin *
                      </label>

                      <div className="relative">
                        <CalendarDays className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                        <input
                          type="date"
                          required
                          min={date || today}
                          value={endDate}
                          onChange={(event) =>
                            setEndDate(event.target.value)
                          }
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Heure souhaitée *
                      </label>

                      <div className="relative">
                        <Clock3 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                        <input
                          type="time"
                          required
                          value={time}
                          onChange={(event) =>
                            setTime(event.target.value)
                          }
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>
                  )}

                </div>

                {multiDay && date && endDate && days > 0 && (
                  <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                    Durée de réservation :{" "}
                    <strong>{days} jour(s)</strong>
                  </div>
                )}

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold">
                    Quantité
                  </label>

                  <div className="flex w-fit items-center gap-4 rounded-lg border border-zinc-200 p-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.max(1, value - 1))
                      }
                      disabled={quantity <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 transition hover:bg-orange-100 hover:text-orange-700 disabled:opacity-40"
                    >
                      <Minus size={16} />
                    </button>

                    <span className="min-w-8 text-center font-bold">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.min(100, value + 1))
                      }
                      disabled={quantity >= 100}
                      className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 transition hover:bg-orange-100 hover:text-orange-700 disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </section>

              {/* CHAMPS PERSONNALISÉS */}

              {service.customFields.length > 0 && (
                <section className="rounded-xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-lg font-bold text-zinc-900">
                    Informations complémentaires
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Informations demandées par l'établissement.
                  </p>

                  <div className="mt-6 space-y-5">
                    {service.customFields.map(renderCustomField)}
                  </div>
                </section>
              )}

              {/* MODE DE PAIEMENT */}

              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <h2 className="text-lg font-bold text-zinc-900">
                  Mode de paiement
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Choisissez le réseau Mobile Money à utiliser.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  <button
                    type="button"
                    onClick={() => setNetwork("moov_tg")}
                    className={`rounded-xl border p-4 text-left transition ${
                      network === "moov_tg"
                        ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500/10"
                        : "border-zinc-200 hover:border-orange-200"
                    }`}
                  >
                    <span className="block text-sm font-bold text-zinc-900">
                      Moov Money
                    </span>

                    <span className="mt-1 block text-xs text-zinc-500">
                      Paiement Mobile Money
                    </span>

                    {network === "moov_tg" && (
                      <CheckCircle2
                        size={18}
                        className="mt-3 text-orange-600"
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNetwork("togocel")}
                    className={`rounded-xl border p-4 text-left transition ${
                      network === "togocel"
                        ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500/10"
                        : "border-zinc-200 hover:border-orange-200"
                    }`}
                  >
                    <span className="block text-sm font-bold text-zinc-900">
                      TMoney
                    </span>

                    <span className="mt-1 block text-xs text-zinc-500">
                      Paiement Mobile Money
                    </span>

                    {network === "togocel" && (
                      <CheckCircle2
                        size={18}
                        className="mt-3 text-orange-600"
                      />
                    )}
                  </button>

                </div>

                {/* NUMÉRO MOBILE MONEY À DÉBITER */}

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Numéro Mobile Money à débiter *
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                    <input
                      type="tel"
                      required
                      minLength={6}
                      maxLength={25}
                      value={paymentPhone}
                      onChange={(event) =>
                        setPaymentPhone(event.target.value)
                      }
                      placeholder="+228 90 00 00 00"
                      className={`${inputClass} pl-10`}
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Entrez le numéro associé à votre compte Moov Money ou TMoney.
                    Il peut être différent de votre téléphone de contact.
                  </p>
                </div>
              </section>

              {/* ERREUR */}

              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* BOUTON */}

              <button
                type="submit"
                disabled={loading || !date || (multiDay && (!endDate || days <= 0))}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-orange-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Enregistrement de la réservation...
                  </>
                ) : (
                  <>
                    Continuer vers le paiement
                    <ArrowRight size={19} />
                  </>
                )}
              </button>

              <p className="text-center text-xs leading-5 text-zinc-400">
                Votre réservation sera temporairement conservée pendant 20 minutes.
              </p>

            </form>
          ) : (

            /* ÉTAPE PAIEMENT */

            <section className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <CreditCard size={27} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-zinc-900">
                Paiement de votre réservation
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Votre réservation est enregistrée. Validez maintenant
                la demande de paiement sur votre téléphone si nécessaire.
              </p>

              {booking && (
                <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-zinc-500">
                      Référence
                    </span>

                    <span className="font-mono text-sm font-bold text-zinc-900">
                      {booking.reference}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
                    <span className="text-sm text-zinc-500">
                      Montant à payer
                    </span>

                    <span className="text-xl font-bold text-orange-600">
                      {formatAmount(booking.amount, booking.currency)}
                    </span>
                  </div>
                </div>
              )}

              {notice && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
                  {verifying ? (
                    <Loader2 size={19} className="mt-0.5 shrink-0 animate-spin" />
                  ) : (
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  )}

                  {notice}
                </div>
              )}

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-6 flex items-center gap-3 rounded-lg border border-zinc-100 p-4">
                <ShieldCheck size={22} className="shrink-0 text-green-600" />

                <p className="text-xs leading-5 text-zinc-500">
                  Ne communiquez jamais votre code PIN Mobile Money.
                  La validation du paiement se fait uniquement sur votre téléphone.
                </p>
              </div>

              <div className="mt-6 space-y-3">

                {paymentId && (
                  <button
                    type="button"
                    onClick={() => verifyPayment(paymentId, true)}
                    disabled={verifying || loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Vérification en cours...
                      </>
                    ) : (
                      <>
                        Vérifier mon paiement
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                )}

                {booking && (
                  <button
                    type="button"
                    onClick={() => createPayment(booking.id)}
                    disabled={loading || verifying}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {loading ? "Initialisation..." : "Effectuer une nouvelle tentative"}
                  </button>
                )}

                <a
                  href="/client/tickets"
                  className="block py-2 text-center text-sm font-semibold text-zinc-500 transition hover:text-orange-600"
                >
                  Consulter mes tickets
                </a>

              </div>
            </section>
          )}

        </div>

        {/* RÉCAPITULATIF */}

        <aside className="space-y-5">

          <section className="sticky top-6 rounded-xl border border-zinc-200 bg-white p-6">

            <h2 className="text-lg font-bold text-zinc-900">
              Récapitulatif
            </h2>

            <div className="mt-5 border-b border-zinc-100 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                {service.profile.businessName}
              </p>

              <p className="mt-2 font-bold text-zinc-900">
                {service.name}
              </p>

              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                <MapPin size={15} />
                {service.profile.city}
              </p>
            </div>

            <div className="space-y-4 border-b border-zinc-100 py-5">

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-500">
                  Prix unitaire
                </span>

                <span className="font-semibold text-zinc-900">
                  {formatAmount(service.price, service.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-500">
                  Quantité
                </span>

                <span className="font-semibold text-zinc-900">
                  {quantity}
                </span>
              </div>

              {multiDay && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-500">
                    Durée
                  </span>

                  <span className="font-semibold text-zinc-900">
                    {days > 0 ? `${days} jour(s)` : "À définir"}
                  </span>
                </div>
              )}

              {date && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-500">
                    Date de début
                  </span>

                  <span className="font-semibold text-zinc-900">
                    {date}
                  </span>
                </div>
              )}

            </div>

            <div className="pt-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-600">
                  Total à payer
                </span>

                <span className="text-2xl font-bold text-orange-600">
                  {formatAmount(estimatedAmount, service.currency)}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Le montant définitif est calculé et vérifié par le serveur.
              </p>
            </div>

          </section>

          <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="text-orange-600" />

              <h3 className="text-sm font-bold text-orange-900">
                Paiement sécurisé
              </h3>
            </div>

            <p className="mt-2 text-xs leading-6 text-orange-800/80">
              Votre réservation est confirmée uniquement après validation
              effective du paiement. Votre QR code sera ensuite disponible
              dans votre espace client.
            </p>
          </div>

        </aside>

      </div>
    </div>
  );
}