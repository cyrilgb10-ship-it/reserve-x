import { connection, NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import {
  BookingStatus,
  Prisma,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TIME_ZONE = "Africa/Lome";
const PENDING_HOLD_MINUTES = 20;
const MAX_TRANSACTION_RETRIES = 3;

const reservationSchema = z.object({
  serviceId: z.string().min(1),

  customerFirstName: z.string().trim().min(2).max(80),
  customerLastName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(6).max(25),
  customerEmail: z.string().trim().email().max(150),

  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional(),

  quantity: z.number().int().min(1).max(100).default(1),

  fieldValues: z.record(z.string(), z.string()).optional(),
});

const activeStatuses = [
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.CONFIRMED,
];

function getLocalDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return `${year}-${month}-${day}`;
}

function getLocalWeekday(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(date);

  const days: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return days[weekday];
}

function getTimeInLome(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function getDateKeysBetween(start: Date, end: Date) {
  const keys: string[] = [];

  const first = getLocalDateKey(start);
  const last = getLocalDateKey(
    new Date(end.getTime() - 1)
  );

  const cursor = new Date(`${first}T00:00:00.000Z`);
  const lastDate = new Date(`${last}T00:00:00.000Z`);

  while (cursor <= lastDate) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function getDayBounds(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00.000Z`);

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

function getDurationInDays(start: Date, end: Date) {
  const startKey = getLocalDateKey(start);
  const endKey = getLocalDateKey(end);

  return Math.round(
    (
      Date.parse(`${endKey}T00:00:00.000Z`) -
      Date.parse(`${startKey}T00:00:00.000Z`)
    ) / 86400000
  );
}

function createReference() {
  return `RX-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function validateCustomField(
  field: {
    id: string;
    type: string;
    required: boolean;
    options: unknown;
  },
  value: string | undefined
) {
  if (value === undefined || value.trim() === "") {
    return !field.required;
  }

  const cleanValue = value.trim();

  switch (field.type) {
    case "TEXT":
      return cleanValue.length <= 1000;

    case "NUMBER":
      return (
        cleanValue.length <= 30 &&
        Number.isFinite(Number(cleanValue)) &&
        Number(cleanValue) >= 0
      );

    case "EMAIL":
      return z.string().email().safeParse(cleanValue).success;

    case "PHONE":
      return /^[+0-9\s().-]{6,25}$/.test(cleanValue);

    case "SELECT":
      return (
        Array.isArray(field.options) &&
        field.options.includes(cleanValue)
      );

    case "CHECKBOX":
      return cleanValue === "true" || cleanValue === "false";

    default:
      return false;
  }
}

async function createBookingWithRetry(
  operation: () => Promise<{
    id: string;
    reference: string;
    startsAt: Date;
    endsAt: Date | null;
    quantity: number;
    amount: number;
    currency: string;
    status: BookingStatus;
  }>
) {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= MAX_TRANSACTION_RETRIES;
    attempt++
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const isSerializationError =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (
        !isSerializationError ||
        attempt === MAX_TRANSACTION_RETRIES
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 150)
      );
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    // ==================================================
    // VALIDATION DES DONNÉES
    // ==================================================

    const body = await request.json().catch(() => null);

    const validation = reservationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Les informations de réservation sont invalides.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // ==================================================
    // AUTHENTIFICATION OBLIGATOIRE DU CLIENT
    // ==================================================

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Vous devez vous connecter pour effectuer une réservation.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      );
    }

    if (session.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          error: "Seuls les comptes clients peuvent effectuer une réservation.",
          code: "CUSTOMER_ACCOUNT_REQUIRED",
        },
        { status: 403 }
      );
    }

    const customer = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!customer || customer.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          error: "Votre compte client est introuvable.",
          code: "CUSTOMER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    const customerId = customer.id;

    // ==================================================
    // VALIDATION DES DATES
    // ==================================================

    const startsAt = new Date(data.startsAt);

    const requestedEnd = data.endsAt
      ? new Date(data.endsAt)
      : null;

    const now = new Date();

    if (
      !Number.isFinite(startsAt.getTime()) ||
      startsAt <= now
    ) {
      return NextResponse.json(
        {
          error: "La date de réservation doit être dans le futur.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // RÉCUPÉRATION DE LA PRESTATION
    // ==================================================

    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        isActive: true,
        profile: {
          isPublished: true,
        },
      },
      include: {
        profile: {
          select: {
            id: true,
            category: true,
            businessHours: true,
          },
        },
        availabilities: {
          where: {
            isActive: true,
          },
        },
        blockedPeriods: true,
        customFields: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          error: "Cette prestation est introuvable ou indisponible.",
        },
        { status: 404 }
      );
    }

    // ==================================================
    // IDENTIFICATION DES CATÉGORIES
    // ==================================================

    const isHotel = service.profile.category === "HOTEL";
    const isVehicle = service.profile.category === "VEHICLE";

    const isMultiDay = isHotel || isVehicle;

    // ==================================================
    // CALCUL DE L'HEURE DE FIN
    // ==================================================

    let endsAt: Date;

    if (isMultiDay) {
      if (
        !requestedEnd ||
        requestedEnd <= startsAt ||
        getLocalDateKey(requestedEnd) === getLocalDateKey(startsAt)
      ) {
        return NextResponse.json(
          {
            error: "Veuillez choisir une date de départ valide.",
          },
          { status: 400 }
        );
      }

      endsAt = requestedEnd;

      const duration = getDurationInDays(startsAt, endsAt);

      if (duration < 1 || duration > 365) {
        return NextResponse.json(
          {
            error: "La durée de réservation est invalide.",
          },
          { status: 400 }
        );
      }
    } else {
      if (requestedEnd) {
        return NextResponse.json(
          {
            error:
              "Une date de fin ne doit pas être fournie pour cette prestation.",
          },
          { status: 400 }
        );
      }

      const duration = service.durationMinutes ?? 60;

      if (duration < 1 || duration > 1440) {
        return NextResponse.json(
          {
            error: "La durée de cette prestation est invalide.",
          },
          { status: 400 }
        );
      }

      endsAt = new Date(
        startsAt.getTime() + duration * 60 * 1000
      );

      // Une prestation classique doit tenir dans la même journée.
      if (
        getLocalDateKey(startsAt) !== getLocalDateKey(endsAt)
      ) {
        return NextResponse.json(
          {
            error:
              "Cette prestation ne peut pas dépasser la fin de la journée.",
          },
          { status: 400 }
        );
      }
    }

    const dateKeys = getDateKeysBetween(startsAt, endsAt);

    if (dateKeys.length > 366) {
      return NextResponse.json(
        {
          error: "La période demandée est trop longue.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // VÉRIFICATION DES HORAIRES
    // PRESTATIONS CLASSIQUES
    // ==================================================

    if (!isMultiDay) {
      const weekday = getLocalWeekday(startsAt);

      const serviceHours = service.availabilities.filter(
        (availability) => availability.dayOfWeek === weekday
      );

      const businessHour = service.profile.businessHours.find(
        (hour) => hour.dayOfWeek === weekday
      );

      const startTime = getTimeInLome(startsAt);
      const endTime = getTimeInLome(endsAt);

      if (service.availabilities.length > 0) {
        const validSlot = serviceHours.some(
          (availability) =>
            startTime >= availability.startTime &&
            endTime <= availability.endTime
        );

        if (!validSlot) {
          return NextResponse.json(
            {
              error:
                "Cette prestation n'est pas disponible à cet horaire.",
            },
            { status: 409 }
          );
        }
      } else {
        if (
          !businessHour ||
          !businessHour.isOpen ||
          startTime < businessHour.openTime ||
          endTime > businessHour.closeTime
        ) {
          return NextResponse.json(
            {
              error:
                "L'établissement est fermé ou indisponible à cet horaire.",
            },
            { status: 409 }
          );
        }
      }
    }

    // ==================================================
    // VÉRIFICATION DES PÉRIODES BLOQUÉES
    // ==================================================

    const blockedPeriod = service.blockedPeriods.find(
      (period) =>
        period.startsAt < endsAt &&
        period.endsAt > startsAt
    );

    if (blockedPeriod) {
      return NextResponse.json(
        {
          error: "Cette période n'est pas disponible.",
        },
        { status: 409 }
      );
    }

    // ==================================================
    // VÉRIFICATION DES CHAMPS PERSONNALISÉS
    // ==================================================

    const submittedFields = data.fieldValues ?? {};

    const customFieldIds = new Set(
      service.customFields.map((field) => field.id)
    );

    for (const fieldId of Object.keys(submittedFields)) {
      if (!customFieldIds.has(fieldId)) {
        return NextResponse.json(
          {
            error: "Un champ personnalisé est invalide.",
          },
          { status: 400 }
        );
      }
    }

    for (const field of service.customFields) {
      if (
        !validateCustomField(
          field,
          submittedFields[field.id]
        )
      ) {
        return NextResponse.json(
          {
            error: `Le champ "${field.label}" est obligatoire ou invalide.`,
          },
          { status: 400 }
        );
      }
    }

    // ==================================================
    // CALCUL DU MONTANT CÔTÉ SERVEUR
    // ==================================================

    let amount: number;

    if (isMultiDay) {
      const duration = getDurationInDays(startsAt, endsAt);

      amount = service.price * duration * data.quantity;
    } else {
      amount = service.price * data.quantity;
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 100_000_000
    ) {
      return NextResponse.json(
        {
          error: "Le montant de la réservation est invalide.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // EXPIRATION DES ANCIENNES RÉSERVATIONS
    // ==================================================

    const expirationDate = new Date(
      Date.now() - PENDING_HOLD_MINUTES * 60 * 1000
    );

    await prisma.booking.updateMany({
      where: {
        serviceId: service.id,
        status: BookingStatus.PENDING_PAYMENT,
        createdAt: {
          lt: expirationDate,
        },
      },
      data: {
        status: BookingStatus.EXPIRED,
      },
    });

    // ==================================================
    // CRÉATION SÉCURISÉE DE LA RÉSERVATION
    // ==================================================

    const booking = await createBookingWithRetry(() =>
      prisma.$transaction(
        async (tx) => {
          // ----------------------------------------------
          // CAS 1 : HÔTELS ET VÉHICULES
          // CONSERVATION DU CONTRÔLE DE CAPACITÉ
          // ----------------------------------------------

          if (isMultiDay) {
            for (const dateKey of dateKeys) {
              const { start, end } = getDayBounds(dateKey);

              const existingBookings = await tx.booking.findMany({
                where: {
                  serviceId: service.id,
                  status: {
                    in: activeStatuses,
                  },
                  startsAt: {
                    lt: end,
                  },
                  OR: [
                    {
                      endsAt: null,
                    },
                    {
                      endsAt: {
                        gt: start,
                      },
                    },
                  ],
                },
                select: {
                  quantity: true,
                },
              });

              const alreadyReserved = existingBookings.reduce(
                (total, existingBooking) =>
                  total + existingBooking.quantity,
                0
              );

              if (
                alreadyReserved + data.quantity >
                service.capacity
              ) {
                throw new Error("CAPACITY_EXCEEDED");
              }
            }
          }

          // ----------------------------------------------
          // CAS 2 : PRESTATIONS CLASSIQUES
          // AUCUNE LIMITE QUOTIDIENNE DE RÉSERVATIONS
          // MAIS INTERDICTION DES CHEVAUCHEMENTS
          // ----------------------------------------------

          if (!isMultiDay) {
            const durationMinutes =
              service.durationMinutes ?? 60;

            const earliestPossibleStart = new Date(
              startsAt.getTime() - durationMinutes * 60 * 1000
            );

            const overlappingBooking = await tx.booking.findFirst({
              where: {
                serviceId: service.id,

                status: {
                  in: activeStatuses,
                },

                startsAt: {
                  gt: earliestPossibleStart,
                  lt: endsAt,
                },
              },
              select: {
                id: true,
                startsAt: true,
              },
            });

            if (overlappingBooking) {
              throw new Error("TIME_SLOT_UNAVAILABLE");
            }
          }

          // ----------------------------------------------
          // CRÉATION DE LA RÉSERVATION
          // ----------------------------------------------

          const createdBooking = await tx.booking.create({
            data: {
              reference: createReference(),

              profileId: service.profile.id,
              serviceId: service.id,
              customerId,

              customerFirstName: data.customerFirstName,
              customerLastName: data.customerLastName,
              customerPhone: data.customerPhone,
              customerEmail: data.customerEmail,

              startsAt,

              // Les réservations classiques conservent
              // endsAt à null dans la base.
              endsAt: isMultiDay ? endsAt : null,

              quantity: data.quantity,
              amount,
              currency: service.currency,

              status: BookingStatus.PENDING_PAYMENT,

              fieldValues: {
                create: service.customFields
                  .filter(
                    (field) =>
                      submittedFields[field.id] !== undefined &&
                      submittedFields[field.id].trim() !== ""
                  )
                  .map((field) => ({
                    customFieldId: field.id,
                    value: submittedFields[field.id].trim(),
                  })),
              },
            },
            select: {
              id: true,
              reference: true,
              startsAt: true,
              endsAt: true,
              quantity: true,
              amount: true,
              currency: true,
              status: true,
            },
          });

          return createdBooking;
        },
        {
          isolationLevel: "Serializable",
        }
      )
    );

    // ==================================================
    // RÉPONSE
    // ==================================================

    return NextResponse.json(
      {
        success: true,
        message: "Votre réservation a été enregistrée.",
        booking,
        paymentRequired: true,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CAPACITY_EXCEEDED"
    ) {
      return NextResponse.json(
        {
          error:
            "Désolé, la capacité disponible est insuffisante pour cette date.",
          code: "CAPACITY_EXCEEDED",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "TIME_SLOT_UNAVAILABLE"
    ) {
      return NextResponse.json(
        {
          error:
            "Ce créneau est déjà réservé. Veuillez choisir un autre horaire.",
          code: "TIME_SLOT_UNAVAILABLE",
        },
        { status: 409 }
      );
    }

    console.error("POST /api/reservations:", error);

    return NextResponse.json(
      {
        error: "Impossible de créer votre réservation.",
      },
      { status: 500 }
    );
  }
}