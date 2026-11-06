import { connection, NextRequest, NextResponse } from "next/server";

import {
  createHmac,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";

import {
  BookingStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { creditBookingToPendingBalance } from "@/lib/wallet";

import {
  createBookingPaymentNotifications,
  sendPushNotifications,
  transitionPaymentAndNotify,
  type PushNotificationInput,
} from "@/lib/notifications";

const MAX_WEBHOOK_AGE_SECONDS = 300;
const MAX_WEBHOOK_BODY_SIZE = 64 * 1024;

const PENDING_HOLD_MINUTES = 20;
const MAX_TRANSACTION_RETRIES = 3;

const SUPPORTED_EVENTS = [
  "transaction.success",
  "transaction.failed",
  "transaction.cancelled",
] as const;

type SasPayPayload = {
  event?: string;

  data?: {
    id?: string;
    status?: string;
    amount?: string | number;
    currency?: string;

    metadata?: {
      bookingId?: string;
      bookingReference?: string;
      paymentId?: string;
      attemptNumber?: number | string;
    };
  };
};

type InternalWebhookResult = {
  confirmed: boolean;
  stale: boolean;
  expired: boolean;
  credited?: boolean;
  reason?: string;
  pushNotifications: PushNotificationInput[];
};

function verifySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const timestampNumber = Number(timestamp);

  if (
    !Number.isSafeInteger(timestampNumber) ||
    timestampNumber <= 0
  ) {
    return false;
  }

  const timestampInSeconds =
    timestampNumber > 1_000_000_000_000
      ? Math.floor(timestampNumber / 1000)
      : timestampNumber;

  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (
    Math.abs(currentTimestamp - timestampInSeconds) >
    MAX_WEBHOOK_AGE_SECONDS
  ) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const receivedSignature = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  if (!/^[a-f0-9]{64}$/i.test(receivedSignature)) {
    return false;
  }

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "hex",
  );

  const receivedBuffer = Buffer.from(
    receivedSignature,
    "hex",
  );

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

async function processSuccessfulPayment(
  paymentId: string,
  providerPaymentId: string,
  receivedAmount: number,
  receivedCurrency: string,
): Promise<InternalWebhookResult> {
  for (
    let attempt = 0;
    attempt < MAX_TRANSACTION_RETRIES;
    attempt++
  ) {
    try {
      const result: InternalWebhookResult =
        await prisma.$transaction(
          async (tx) => {
            const currentPayment = await tx.payment.findUnique({
              where: {
                id: paymentId,
              },
            });

            if (
              !currentPayment ||
              currentPayment.providerPaymentId !== providerPaymentId ||
              currentPayment.amount !== receivedAmount ||
              currentPayment.currency !== receivedCurrency
            ) {
              throw new Error("IDENTITE_PAIEMENT_INVALIDE");
            }

            const booking = await tx.booking.findUnique({
              where: {
                id: currentPayment.bookingId,
              },
              select: {
                id: true,
                reference: true,
                customerId: true,
                profileId: true,
                amount: true,
                currency: true,
                status: true,
                qrToken: true,
                paymentAttempt: true,
                createdAt: true,
              },
            });

            if (!booking) {
              throw new Error("RESERVATION_INTROUVABLE");
            }

            if (
              booking.amount !== currentPayment.amount ||
              booking.currency !== currentPayment.currency
            ) {
              throw new Error("MONTANT_RESERVATION_INCOHERENT");
            }

            // Enregistrer le paiement réellement confirmé par SasPay.
            //
            // Une ancienne tentative peut être SUCCESS :
            // elle sera conservée pour réconciliation,
            // mais ne pourra jamais confirmer la réservation.

            await tx.payment.updateMany({
              where: {
                id: currentPayment.id,
                status: {
                  in: [
                    PaymentStatus.PENDING,
                    PaymentStatus.CANCELLED,
                    PaymentStatus.FAILED,
                  ],
                },
              },
              data: {
                status: PaymentStatus.SUCCESS,
                paidAt: new Date(),
                verifiedAt: new Date(),
              },
            });

            const updatedPayment = await tx.payment.findUnique({
              where: {
                id: currentPayment.id,
              },
            });

            if (
              !updatedPayment ||
              updatedPayment.status !== PaymentStatus.SUCCESS
            ) {
              return {
                confirmed: false,
                stale: false,
                expired: false,
                reason: "payment_not_successful",
                pushNotifications: [],
              };
            }

            // Une ancienne tentative ne peut jamais confirmer.
            if (
              updatedPayment.attemptNumber !== booking.paymentAttempt
            ) {
              return {
                confirmed: false,
                stale: true,
                expired: false,
                reason: "old_payment_attempt",
                pushNotifications: [],
              };
            }

            // Interdiction de réactiver une réservation annulée,
            // expirée ou remboursée.
            if (
              booking.status === BookingStatus.CANCELLED ||
              booking.status === BookingStatus.EXPIRED ||
              booking.status === BookingStatus.REFUNDED
            ) {
              return {
                confirmed: false,
                stale: false,
                expired: booking.status === BookingStatus.EXPIRED,
                reason: "booking_unavailable",
                pushNotifications: [],
              };
            }

            // Vérifier la limite de 20 minutes.
            if (booking.status === BookingStatus.PENDING_PAYMENT) {
              const expirationTime =
                booking.createdAt.getTime() +
                PENDING_HOLD_MINUTES * 60 * 1000;

              if (Date.now() >= expirationTime) {
                await tx.booking.updateMany({
                  where: {
                    id: booking.id,
                    status: BookingStatus.PENDING_PAYMENT,
                    paymentAttempt: updatedPayment.attemptNumber,
                  },
                  data: {
                    status: BookingStatus.EXPIRED,
                  },
                });

                return {
                  confirmed: false,
                  stale: false,
                  expired: true,
                  reason: "payment_received_after_expiration",
                  pushNotifications: [],
                };
              }
            }

            // Confirmer uniquement la dernière tentative.
            let bookingConfirmedNow = false;

            if (booking.status === BookingStatus.PENDING_PAYMENT) {
              const updatedBooking = await tx.booking.updateMany({
                where: {
                  id: booking.id,
                  status: BookingStatus.PENDING_PAYMENT,
                  paymentAttempt: updatedPayment.attemptNumber,
                },
                data: {
                  status: BookingStatus.CONFIRMED,
                  qrToken: randomBytes(32).toString("hex"),
                },
              });

              if (updatedBooking.count !== 1) {
                throw new Error("CONFIRMATION_RESERVATION_ECHOUEE");
              }

              bookingConfirmedNow = true;
            }

            // Vérifier l'état définitif de la réservation.
            const confirmedBooking = await tx.booking.findUnique({
              where: {
                id: booking.id,
              },
              select: {
                id: true,
                reference: true,
                customerId: true,
                profileId: true,
                amount: true,
                currency: true,
                status: true,
                qrToken: true,
                paymentAttempt: true,
              },
            });

            if (
              !confirmedBooking ||
              confirmedBooking.paymentAttempt !==
                updatedPayment.attemptNumber ||
              (
                confirmedBooking.status !== BookingStatus.CONFIRMED &&
                confirmedBooking.status !== BookingStatus.COMPLETED
              ) ||
              !confirmedBooking.qrToken
            ) {
              throw new Error("RESERVATION_NON_CONFIRMEE");
            }

            let credited = false;

            // Créditer le portefeuille une seule fois.
            // Ne jamais recréditer une réservation terminée.
            if (
              confirmedBooking.status === BookingStatus.CONFIRMED
            ) {
              const credit = await creditBookingToPendingBalance(
                tx,
                confirmedBooking,
              );

              credited = credit.credited;
            }

            // Créer les notifications uniquement lors de la première
            // confirmation effective de la réservation.
            //
            // Les notifications en base sont enregistrées dans
            // la même transaction que la confirmation.

            const pushNotifications = bookingConfirmedNow
              ? await createBookingPaymentNotifications(tx, {
                  id: confirmedBooking.id,
                  reference: confirmedBooking.reference,
                  customerId: confirmedBooking.customerId,
                  profileId: confirmedBooking.profileId,
                })
              : [];

            return {
              confirmed: true,
              stale: false,
              expired: false,
              credited,
              pushNotifications,
            };
          },
          {
            isolationLevel: "Serializable",
          },
        );

      // Les push sont envoyés uniquement après le commit.
      await sendPushNotifications(result.pushNotifications);

      return result;
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

  throw new Error("ECHEC_REPETE_TRANSACTION_WEBHOOK");
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    // ==================================================
    // 1. CONFIGURATION
    // ==================================================

    const secret = process.env.SASPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("SASPAY_WEBHOOK_SECRET est absente.");

      return NextResponse.json(
        {
          error: "Webhook indisponible.",
        },
        { status: 503 },
      );
    }

    // ==================================================
    // 2. LIMITER LA TAILLE DU CORPS
    // ==================================================

    const contentLength = Number(
      request.headers.get("content-length") || 0,
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_WEBHOOK_BODY_SIZE
    ) {
      return NextResponse.json(
        {
          error: "Notification trop volumineuse.",
        },
        { status: 413 },
      );
    }

    const rawBody = await request.text();

    if (
      !rawBody ||
      Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BODY_SIZE
    ) {
      return NextResponse.json(
        {
          error: "Notification invalide ou trop volumineuse.",
        },
        { status: 400 },
      );
    }

    // ==================================================
    // 3. VÉRIFICATION DE LA SIGNATURE
    // ==================================================

    const signature = request.headers.get(
      "X-Webhook-Signature",
    );

    const timestamp = request.headers.get(
      "X-Webhook-Timestamp",
    );

    if (!signature || !timestamp) {
      return NextResponse.json(
        {
          error: "Signature manquante.",
        },
        { status: 401 },
      );
    }

    if (
      !verifySignature(
        rawBody,
        signature,
        timestamp,
        secret,
      )
    ) {
      return NextResponse.json(
        {
          error: "Signature invalide ou notification expirée.",
        },
        { status: 401 },
      );
    }

    // ==================================================
    // 4. ANALYSE DU JSON
    // ==================================================

    let payload: SasPayPayload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          error: "Notification invalide.",
        },
        { status: 400 },
      );
    }

    const event = payload.event;
    const data = payload.data;

    if (
      !event ||
      !data ||
      typeof data.id !== "string" ||
      !data.id.trim() ||
      data.id.length > 200
    ) {
      return NextResponse.json(
        {
          error: "Données de notification incomplètes.",
        },
        { status: 400 },
      );
    }

    const headerEvent = request.headers.get(
      "X-Webhook-Event",
    );

    if (headerEvent && headerEvent !== event) {
      return NextResponse.json(
        {
          error: "Type de notification incohérent.",
        },
        { status: 400 },
      );
    }

    // Ignorer les événements non pris en charge.
    // Ne pas rattacher leur identifiant à un paiement.
    if (
      !SUPPORTED_EVENTS.includes(
        event as (typeof SUPPORTED_EVENTS)[number],
      )
    ) {
      return NextResponse.json({
        success: true,
        message: "Événement ignoré.",
      });
    }

    // ==================================================
    // 5. IDENTIFICATION DU PAIEMENT
    // ==================================================

    const metadata = data.metadata;

    let payment = await prisma.payment.findUnique({
      where: {
        providerPaymentId: data.id,
      },
    });

    if (!payment && metadata?.paymentId) {
      const attemptNumber = Number(
        metadata.attemptNumber,
      );

      if (
        !metadata.bookingId ||
        !Number.isSafeInteger(attemptNumber) ||
        attemptNumber < 1
      ) {
        return NextResponse.json(
          {
            error: "Métadonnées de paiement invalides.",
          },
          { status: 400 },
        );
      }

      payment = await prisma.payment.findUnique({
        where: {
          id: metadata.paymentId,
        },
      });

      if (
        !payment ||
        payment.bookingId !== metadata.bookingId ||
        payment.attemptNumber !== attemptNumber
      ) {
        return NextResponse.json(
          {
            error: "Identité du paiement incohérente.",
          },
          { status: 400 },
        );
      }
    }

    if (!payment) {
      return NextResponse.json(
        {
          error: "Paiement introuvable.",
        },
        { status: 404 },
      );
    }

    if (metadata) {
      const metadataAttempt = Number(
        metadata.attemptNumber,
      );

      if (
        metadata.paymentId !== payment.id ||
        metadata.bookingId !== payment.bookingId ||
        metadataAttempt !== payment.attemptNumber
      ) {
        return NextResponse.json(
          {
            error: "Métadonnées incohérentes.",
          },
          { status: 400 },
        );
      }
    }

    if (
      payment.providerPaymentId &&
      payment.providerPaymentId !== data.id
    ) {
      return NextResponse.json(
        {
          error: "Identifiant SasPay incohérent.",
        },
        { status: 409 },
      );
    }

    // ==================================================
    // 6. VÉRIFICATION DU MONTANT ET DE LA DEVISE
    // ==================================================

    const receivedAmount = Number(data.amount);

    if (
      !Number.isSafeInteger(receivedAmount) ||
      receivedAmount !== payment.amount ||
      data.currency !== payment.currency
    ) {
      console.error(
        "Incohérence du montant ou de la devise SasPay.",
        {
          paymentId: payment.id,
        },
      );

      return NextResponse.json(
        {
          error: "Montant ou devise incorrect.",
        },
        { status: 400 },
      );
    }

    // ==================================================
    // 7. RATTACHEMENT SÉCURISÉ DE L'IDENTIFIANT SASPAY
    // ==================================================

    try {
      const binding = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          OR: [
            {
              providerPaymentId: null,
            },
            {
              providerPaymentId: data.id,
            },
          ],
        },
        data: {
          providerPaymentId: data.id,
        },
      });

      if (binding.count !== 1) {
        return NextResponse.json(
          {
            error: "Impossible de rattacher ce paiement.",
          },
          { status: 409 },
        );
      }
    } catch (error) {
      const prismaError = error as {
        code?: string;
      };

      if (prismaError.code === "P2002") {
        return NextResponse.json(
          {
            error: "Cette référence SasPay est déjà utilisée.",
          },
          { status: 409 },
        );
      }

      throw error;
    }

    // ==================================================
    // 8. PAIEMENT RÉUSSI
    // ==================================================

    if (event === "transaction.success") {
      if (data.status !== "SUCCESS") {
        return NextResponse.json(
          {
            error: "Statut de transaction incohérent.",
          },
          { status: 400 },
        );
      }

      const result = await processSuccessfulPayment(
        payment.id,
        data.id,
        receivedAmount,
        data.currency!,
      );

      // Ancienne tentative payée.
      if (result.stale) {
        console.warn(
          "Ancienne tentative SasPay payée après abandon local.",
          {
            paymentId: payment.id,
            attemptNumber: payment.attemptNumber,
          },
        );

        return NextResponse.json({
          success: true,
          paymentConfirmed: true,
          bookingConfirmed: false,
          staleAttempt: true,
          walletCredited: false,
          message:
            "Ancienne tentative payée enregistrée. Intervention manuelle nécessaire.",
        });
      }

      // Paiement reçu après expiration.
      if (result.expired) {
        console.warn(
          "Paiement SasPay reçu après expiration.",
          {
            paymentId: payment.id,
            bookingId: payment.bookingId,
          },
        );

        return NextResponse.json({
          success: true,
          paymentConfirmed: true,
          bookingConfirmed: false,
          bookingExpired: true,
          qrGenerated: false,
          walletCredited: false,
          message:
            "Paiement tardif enregistré. Intervention manuelle nécessaire.",
        });
      }

      if (!result.confirmed) {
        return NextResponse.json(
          {
            error:
              "Le paiement ou la réservation nécessite une vérification manuelle.",
            reason: result.reason,
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        paymentConfirmed: true,
        bookingConfirmed: true,
        walletCredited: result.credited,
        message: "Paiement confirmé et réservation mise à jour.",
      });
    }

    // ==================================================
    // 9. PAIEMENT ÉCHOUÉ
    // ==================================================

    if (event === "transaction.failed") {
      if (data.status !== "FAILED") {
        return NextResponse.json(
          {
            error: "Statut d'échec incohérent.",
          },
          { status: 400 },
        );
      }

      await transitionPaymentAndNotify(
        payment.id,
        PaymentStatus.FAILED,
      );

      return NextResponse.json({
        success: true,
        message: "Échec du paiement enregistré.",
      });
    }

    // ==================================================
    // 10. PAIEMENT ANNULÉ
    // ==================================================

    if (event === "transaction.cancelled") {
      if (data.status !== "CANCELLED") {
        return NextResponse.json(
          {
            error: "Statut d'annulation incohérent.",
          },
          { status: 400 },
        );
      }

      await transitionPaymentAndNotify(
        payment.id,
        PaymentStatus.CANCELLED,
      );

      return NextResponse.json({
        success: true,
        message: "Annulation du paiement enregistrée.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Notification traitée.",
    });
  } catch (error) {
    console.error("SasPay webhook error:", error);

    return NextResponse.json(
      {
        error: "Erreur lors du traitement de la notification.",
      },
      { status: 500 },
    );
  }
}