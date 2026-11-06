import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  BookingStatus,
  PaymentStatus,
  WalletTransactionType,
  Prisma,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { creditBookingToPendingBalance } from "@/lib/wallet";

const MAX_TRANSACTION_RETRIES = 3;

const qrSchema = z.object({
  qrCode: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i, "QR code invalide."),
});

type ValidationOutcome =
  | { kind: "NOT_FOUND" }
  | { kind: "PAYMENT_NOT_CONFIRMED" }
  | { kind: "PAYMENT_MISMATCH" }
  | { kind: "ALREADY_USED" }
  | { kind: "ALREADY_RELEASED" }
  | { kind: "BOOKING_NOT_CONFIRMABLE" }
  | {
      kind: "SUCCESS";
      booking: {
        id: string;
        reference: string;
        customerFirstName: string;
        customerLastName: string;
        customerPhone: string;
        customerEmail: string;
        serviceName: string;
        amount: number;
        currency: string;
        completedAt: Date;
      };
    };

function isRetryableTransactionError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002")
  ) {
    return true;
  }

  return false;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    // ================================================
    // 1. VÉRIFICATION DE LA SESSION PROFESSIONNELLE
    // ================================================

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 },
      );
    }

    if (session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès réservé aux professionnels." },
        { status: 403 },
      );
    }

    const profile = await prisma.professionalProfile.findUnique({
      where: {
        userId: session.userId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profil professionnel introuvable." },
        { status: 404 },
      );
    }

    // ================================================
    // 2. VALIDATION DES DONNÉES
    // ================================================

    const body = await request.json().catch(() => null);
    const validation = qrSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "QR code invalide.",
        },
        { status: 400 },
      );
    }

    const { qrCode } = validation.data;
    const releaseReference = `BOOKING_RELEASE_${qrCode}`;

    // ================================================
    // 3. VALIDATION ET TRANSFERT ATOMIQUES
    // ================================================

    let outcome: ValidationOutcome | null = null;

    for (
      let attempt = 1;
      attempt <= MAX_TRANSACTION_RETRIES;
      attempt++
    ) {
      try {
        outcome = await prisma.$transaction(
          async (tx): Promise<ValidationOutcome> => {
            const booking = await tx.booking.findFirst({
              where: {
                qrToken: qrCode,
                profileId: profile.id,
              },
              include: {
                service: {
                  select: {
                    name: true,
                  },
                },
                payments: {
                  orderBy: {
                    attemptNumber: "desc",
                  },
                  take: 1,
                  select: {
                    attemptNumber: true,
                    status: true,
                    amount: true,
                    currency: true,
                  },
                },
              },
            });

            if (!booking) {
              return { kind: "NOT_FOUND" };
            }

            // ==========================================
            // Vérifier la dernière tentative de paiement
            // ==========================================

            const latestPayment = booking.payments[0];

            const currentPayment =
              latestPayment?.attemptNumber === booking.paymentAttempt
                ? latestPayment
                : null;

            if (
              !currentPayment ||
              currentPayment.status !== PaymentStatus.SUCCESS
            ) {
              return { kind: "PAYMENT_NOT_CONFIRMED" };
            }

            if (
              currentPayment.amount !== booking.amount ||
              currentPayment.currency !== booking.currency ||
              !Number.isSafeInteger(booking.amount) ||
              booking.amount <= 0
            ) {
              return { kind: "PAYMENT_MISMATCH" };
            }

            // ==========================================
            // Vérifier que le QR n'a pas déjà été utilisé
            // ==========================================

            if (
              booking.status === BookingStatus.COMPLETED ||
              booking.qrUsedAt ||
              booking.completedAt
            ) {
              return { kind: "ALREADY_USED" };
            }

            if (booking.status !== BookingStatus.CONFIRMED) {
              return { kind: "BOOKING_NOT_CONFIRMABLE" };
            }

            // ==========================================
            // Vérifier l'absence de transfert précédent
            // ==========================================

            const previousRelease =
              await tx.walletTransaction.findUnique({
                where: {
                  reference: releaseReference,
                },
                select: {
                  id: true,
                },
              });

            if (previousRelease) {
              return { kind: "ALREADY_RELEASED" };
            }

            const now = new Date();

            // ==========================================
            // Marquer la réservation comme terminée
            // ==========================================

            const updatedBooking = await tx.booking.updateMany({
              where: {
                id: booking.id,
                profileId: profile.id,
                qrToken: qrCode,
                paymentAttempt: currentPayment.attemptNumber,
                status: BookingStatus.CONFIRMED,
                qrUsedAt: null,
                completedAt: null,
              },
              data: {
                status: BookingStatus.COMPLETED,
                qrUsedAt: now,
                completedAt: now,
              },
            });

            if (updatedBooking.count !== 1) {
              return { kind: "ALREADY_USED" };
            }

            // ==========================================
            // Vérifier ou créer le crédit en attente
            // ==========================================

            await creditBookingToPendingBalance(tx, {
              id: booking.id,
              profileId: booking.profileId,
              amount: booking.amount,
              currency: booking.currency,
            });

            // ==========================================
            // Récupérer le portefeuille
            // ==========================================

            const wallet = await tx.wallet.findUnique({
              where: {
                profileId: profile.id,
              },
              select: {
                id: true,
              },
            });

            if (!wallet) {
              throw new Error("PORTEFEUILLE_INTROUVABLE");
            }

            // ==========================================
            // Transférer vers le solde disponible
            // ==========================================

            const updatedWallet = await tx.wallet.updateMany({
              where: {
                id: wallet.id,
                pendingBalance: {
                  gte: booking.amount,
                },
              },
              data: {
                pendingBalance: {
                  decrement: booking.amount,
                },
                availableBalance: {
                  increment: booking.amount,
                },
              },
            });

            if (updatedWallet.count !== 1) {
              throw new Error("SOLDE_EN_ATTENTE_INSUFFISANT");
            }

            // ==========================================
            // Enregistrer le transfert
            // ==========================================

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                bookingId: booking.id,
                type: WalletTransactionType.ADJUSTMENT,
                amount: booking.amount,
                description:
                  `Transfert du solde en attente vers le solde disponible après validation QR - ${booking.reference}`,
                reference: releaseReference,
              },
            });

            return {
              kind: "SUCCESS",
              booking: {
                id: booking.id,
                reference: booking.reference,
                customerFirstName: booking.customerFirstName,
                customerLastName: booking.customerLastName,
                customerPhone: booking.customerPhone,
                customerEmail: booking.customerEmail,
                serviceName: booking.service.name,
                amount: booking.amount,
                currency: booking.currency,
                completedAt: now,
              },
            };
          },
          {
            isolationLevel: "Serializable",
          },
        );

        break;
      } catch (error) {
        if (
          !isRetryableTransactionError(error) ||
          attempt === MAX_TRANSACTION_RETRIES
        ) {
          throw error;
        }

        await wait(50 * attempt);
      }
    }

    if (!outcome) {
      throw new Error("VALIDATION_TRANSACTION_NON_TERMINEE");
    }

    // ================================================
    // 4. GESTION DES RÉPONSES
    // ================================================

    if (outcome.kind === "NOT_FOUND") {
      return NextResponse.json(
        {
          error:
            "Ce QR code est invalide ou n'appartient pas à votre établissement.",
        },
        { status: 404 },
      );
    }

    if (outcome.kind === "PAYMENT_NOT_CONFIRMED") {
      return NextResponse.json(
        {
          error:
            "Le paiement de cette réservation n'est pas confirmé.",
        },
        { status: 409 },
      );
    }

    if (outcome.kind === "PAYMENT_MISMATCH") {
      return NextResponse.json(
        {
          error:
            "Le montant ou la devise du paiement ne correspond pas à la réservation. Une vérification est nécessaire.",
        },
        { status: 409 },
      );
    }

    if (outcome.kind === "ALREADY_USED") {
      return NextResponse.json(
        {
          error: "Ce ticket a déjà été utilisé.",
        },
        { status: 409 },
      );
    }

    if (outcome.kind === "ALREADY_RELEASED") {
      return NextResponse.json(
        {
          error:
            "Le transfert de cette réservation a déjà été effectué.",
        },
        { status: 409 },
      );
    }

    if (outcome.kind === "BOOKING_NOT_CONFIRMABLE") {
      return NextResponse.json(
        {
          error:
            "Cette réservation ne peut pas être validée.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Prestation validée. Le montant a été transféré vers votre solde disponible.",
      booking: outcome.booking,
      wallet: {
        releasedAmount: outcome.booking.amount,
        currency: outcome.booking.currency,
      },
    });
  } catch (error) {
    console.error(
      "POST /api/pro/reservations/validate:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "SOLDE_EN_ATTENTE_INSUFFISANT"
    ) {
      return NextResponse.json(
        {
          error:
            "Le solde en attente est insuffisant pour effectuer ce transfert. Contactez l'assistance.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de la validation de la réservation.",
      },
      { status: 500 },
    );
  }
}