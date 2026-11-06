import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  BookingStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SASPAY_BASE_URL = "https://api.saspay.me/api/v1";

const PENDING_HOLD_MINUTES = 20;
const MAX_TRANSACTION_RETRIES = 3;

const paymentSchema = z.object({
  bookingId: z.string().trim().min(1).max(100),

  network: z.enum(["moov_tg", "togocel"]),

  paymentPhone: z
    .string()
    .trim()
    .min(6)
    .max(25)
    .regex(
      /^\+?[0-9][0-9\s().-]*$/,
      "Le numéro Mobile Money est invalide."
    )
    .transform((value) => value.replace(/[\s().-]/g, ""))
    .refine(
      (value) => /^\+?\d{6,15}$/.test(value),
      "Le numéro Mobile Money est invalide."
    ),
});

async function createPaymentAttempt(
  bookingId: string,
  customerId: string,
  network: string,
  paymentPhone: string
) {
  return prisma.$transaction(
    async (tx) => {
      const ownedBooking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          customerId,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      if (!ownedBooking) {
        return { kind: "NOT_FOUND" as const };
      }

      if (ownedBooking.status !== BookingStatus.PENDING_PAYMENT) {
        return { kind: "NOT_PAYABLE" as const };
      }

      const expirationTime =
        ownedBooking.createdAt.getTime() +
        PENDING_HOLD_MINUTES * 60 * 1000;

      if (Date.now() >= expirationTime) {
        await tx.booking.updateMany({
          where: {
            id: bookingId,
            customerId,
            status: BookingStatus.PENDING_PAYMENT,
          },
          data: {
            status: BookingStatus.EXPIRED,
          },
        });

        return { kind: "EXPIRED" as const };
      }

      // Incrémentation atomique du numéro de tentative.
      const updated = await tx.booking.updateMany({
        where: {
          id: bookingId,
          customerId,
          status: BookingStatus.PENDING_PAYMENT,
        },
        data: {
          paymentAttempt: {
            increment: 1,
          },
        },
      });

      if (updated.count !== 1) {
        return { kind: "NOT_PAYABLE" as const };
      }

      const booking = await tx.booking.findUnique({
        where: {
          id: bookingId,
        },
      });

      if (!booking) {
        return { kind: "NOT_FOUND" as const };
      }

      // Abandonner localement les anciennes tentatives.
      await tx.payment.updateMany({
        where: {
          bookingId: booking.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.CANCELLED,
        },
      });

      // Créer la nouvelle tentative.
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          attemptNumber: booking.paymentAttempt,
          provider: "SASPAY",
          amount: booking.amount,
          currency: booking.currency,
          status: PaymentStatus.PENDING,
          network,
          customerPhone: paymentPhone,
        },
      });

      return {
        kind: "CREATED" as const,
        booking,
        payment,
      };
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    // 1. Vérifier la session.
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Vous devez être connecté pour effectuer un paiement.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          error: "Seuls les clients peuvent effectuer un paiement.",
        },
        { status: 403 }
      );
    }

    // 2. Vérifier le compte client.
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
        },
        { status: 403 }
      );
    }

    // 3. Valider les données.
    const body = await request.json().catch(() => null);

    const validation = paymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Les informations de paiement sont invalides.",
        },
        { status: 400 }
      );
    }

    const {
      bookingId,
      network,
      paymentPhone,
    } = validation.data;

    // 4. Vérifier la configuration SasPay.
    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      console.error("SASPAY_SECRET_KEY est absente.");

      return NextResponse.json(
        {
          error: "Le service de paiement est momentanément indisponible.",
        },
        { status: 503 }
      );
    }

    // 5. Créer une nouvelle tentative.
    let attemptData:
      | Awaited<ReturnType<typeof createPaymentAttempt>>
      | null = null;

    for (
      let attempt = 0;
      attempt < MAX_TRANSACTION_RETRIES;
      attempt++
    ) {
      try {
        attemptData = await createPaymentAttempt(
          bookingId,
          customer.id,
          network,
          paymentPhone
        );

        break;
      } catch (error) {
        const prismaError = error as {
          code?: string;
        };

        if (
          prismaError.code === "P2034" &&
          attempt < MAX_TRANSACTION_RETRIES - 1
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, (attempt + 1) * 150)
          );

          continue;
        }

        throw error;
      }
    }

    if (!attemptData || attemptData.kind === "NOT_FOUND") {
      return NextResponse.json(
        {
          error: "Réservation introuvable.",
        },
        { status: 404 }
      );
    }

    if (attemptData.kind === "NOT_PAYABLE") {
      return NextResponse.json(
        {
          error:
            "Cette réservation ne peut plus être payée. Vérifiez son statut.",
        },
        { status: 409 }
      );
    }

    if (attemptData.kind === "EXPIRED") {
      return NextResponse.json(
        {
          error:
            "Le délai de paiement de cette réservation est dépassé.",
          code: "BOOKING_EXPIRED",
        },
        { status: 410 }
      );
    }

    const { booking, payment } = attemptData;

    // 6. Préparer la demande SasPay.
    const payload = {
      amount: String(booking.amount),
      currency: booking.currency,
      country: "TG",
      description: `Réservation Reserve X ${booking.reference}`,
      customer: {
        email: booking.customerEmail,
        first_name: booking.customerFirstName,
        last_name: booking.customerLastName,
        phone: payment.customerPhone,
      },
      network,
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        paymentId: payment.id,
        attemptNumber: payment.attemptNumber,
      },
      fee_charge_mode: "ADD_ON",
    };

    // 7. Initialiser le paiement chez SasPay.
    let response: Response;

    try {
      response = await fetch(
        `${SASPAY_BASE_URL}/payments/softpay/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": payment.id,
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }
      );
    } catch (error) {
      console.error("Erreur réseau SasPay :", error);

      return NextResponse.json(
        {
          error:
            "La réponse du service de paiement n'a pas été reçue. Vérifiez votre paiement avant de réessayer.",
          code: "SASPAY_RESPONSE_TIMEOUT",
          paymentId: payment.id,
        },
        { status: 502 }
      );
    }

    // 8. Lire la réponse SasPay.
    const result = await response.json().catch(() => null);

    /*
     * SasPay peut retourner deux formats :
     *
     * Format direct :
     * {
     *   id: "...",
     *   status: "PENDING"
     * }
     *
     * Format enveloppé :
     * {
     *   success: true,
     *   data: {
     *     id: "...",
     *     status: "PENDING",
     *     checkout_url: ""
     *   }
     * }
     *
     * On prend data lorsqu'il existe.
     */
    const providerData =
      result?.data &&
      typeof result.data === "object" &&
      !Array.isArray(result.data)
        ? result.data
        : result;

    if (
      !response.ok ||
      !result ||
      typeof result !== "object" ||
      result.success === false ||
      !providerData ||
      typeof providerData.id !== "string" ||
      providerData.id.trim().length === 0 ||
      providerData.id.trim().length > 200
    ) {
      console.error("Initialisation SasPay non confirmée :", {
        httpStatus: response.status,
        success: result?.success,
        hasData: Boolean(result?.data),
        providerStatus: providerData?.status ?? null,
        hasProviderId: Boolean(providerData?.id),
        code: result?.code ?? null,
      });

      return NextResponse.json(
        {
          error: "Impossible de confirmer l'initialisation du paiement.",
          code: "SASPAY_INITIALIZATION_UNCONFIRMED",
          paymentId: payment.id,
        },
        { status: 502 }
      );
    }

    // IMPORTANT : récupérer l'identifiant dans providerData.
    const providerPaymentId = providerData.id.trim();

    // 9. Enregistrer la référence SasPay.
    // Ne jamais écraser une référence déjà enregistrée.
    const linkedPayment = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        OR: [
          {
            providerPaymentId: null,
          },
          {
            providerPaymentId,
          },
        ],
      },
      data: {
        providerPaymentId,
      },
    });

    if (linkedPayment.count !== 1) {
      const currentPayment = await prisma.payment.findUnique({
        where: {
          id: payment.id,
        },
        select: {
          providerPaymentId: true,
          status: true,
        },
      });

      if (
        !currentPayment ||
        currentPayment.providerPaymentId !== providerPaymentId
      ) {
        console.error("Conflit de référence SasPay :", {
          paymentId: payment.id,
        });

        return NextResponse.json(
          {
            error:
              "Une incohérence a été détectée lors de l'enregistrement du paiement.",
            code: "PAYMENT_REFERENCE_CONFLICT",
          },
          { status: 409 }
        );
      }
    }

    // 10. Récupérer l'URL éventuelle.
    // Pour un paiement Mobile Money par push, elle peut être vide.
    const checkoutUrl =
      typeof providerData.checkout_url === "string" &&
      providerData.checkout_url.trim().length > 0
        ? providerData.checkout_url.trim()
        : null;

    // 11. Répondre au client.
    // Le paiement reste PENDING jusqu'à sa vérification réelle.
    return NextResponse.json(
      {
        success: true,
        message: "Demande de paiement envoyée.",
        payment: {
          id: payment.id,
          attemptNumber: payment.attemptNumber,
          providerPaymentId,
          status: PaymentStatus.PENDING,
          network: payment.network,
          customerPhone: payment.customerPhone,
          checkoutUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/payments:", error);

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de l'initialisation du paiement.",
      },
      { status: 500 }
    );
  }
}