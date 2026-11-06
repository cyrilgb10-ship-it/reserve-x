import { connection, NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import {
  BookingStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creditBookingToPendingBalance } from "@/lib/wallet";

import {
  createBookingPaymentNotifications,
  sendPushNotifications,
  transitionPaymentAndNotify,
  type PushNotificationInput,
} from "@/lib/notifications";

const SASPAY_BASE_URL = "https://api.saspay.me/api/v1";

const PENDING_HOLD_MINUTES = 20;
const MAX_TRANSACTION_RETRIES = 3;

type RouteContext = {
  params: Promise<{
    paymentId: string;
  }>;
};

type VerificationResult = {
  confirmed: boolean;
  stale: boolean;
  expired: boolean;
  bookingStatus: BookingStatus;
  walletCredited: boolean;
};

type InternalVerificationResult = VerificationResult & {
  pushNotifications: PushNotificationInput[];
};

type ProviderResponse = Record<string, unknown>;

function isRecord(value: unknown): value is ProviderResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateProviderAmountAndCurrency(
  paymentData: ProviderResponse,
  expectedAmount: number,
  expectedCurrency: string,
  required: boolean,
): boolean {
  const hasAmount = paymentData.amount !== undefined &&
    paymentData.amount !== null;

  const hasCurrency = paymentData.currency !== undefined &&
    paymentData.currency !== null;

  if (required && (!hasAmount || !hasCurrency)) {
    return false;
  }

  // Si SasPay fournit le montant, il doit correspondre.
  if (hasAmount) {
    const amount = Number(paymentData.amount);

    if (
      !Number.isSafeInteger(amount) ||
      amount !== expectedAmount
    ) {
      return false;
    }
  }

  // Si SasPay fournit la devise, elle doit correspondre.
  if (hasCurrency) {
    if (
      typeof paymentData.currency !== "string" ||
      paymentData.currency !== expectedCurrency
    ) {
      return false;
    }
  }

  return true;
}

async function processSuccessfulPayment(
  paymentId: string,
  providerPaymentId: string,
  receivedAmount: number,
  receivedCurrency: string,
  customerId: string,
): Promise<VerificationResult> {
  for (
    let attempt = 0;
    attempt < MAX_TRANSACTION_RETRIES;
    attempt++
  ) {
    try {
      const result: InternalVerificationResult =
        await prisma.$transaction(
          async (tx) => {
            // 1. Relire le paiement depuis la base.
            const currentPayment = await tx.payment.findUnique({
              where: {
                id: paymentId,
              },
            });

            if (
              !currentPayment ||
              currentPayment.provider !== "SASPAY" ||
              currentPayment.providerPaymentId !== providerPaymentId ||
              currentPayment.amount !== receivedAmount ||
              currentPayment.currency !== receivedCurrency
            ) {
              throw new Error("IDENTITE_PAIEMENT_INVALIDE");
            }

            // 2. Vérifier la réservation du client.
            const booking = await tx.booking.findFirst({
              where: {
                id: currentPayment.bookingId,
                customerId,
              },
              select: {
                id: true,
                reference: true,
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

            // 3. Enregistrer la réussite réelle chez SasPay.
            //
            // Une ancienne tentative peut être SUCCESS chez SasPay,
            // mais elle ne pourra jamais confirmer la réservation
            // si une nouvelle tentative a été créée.

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
              throw new Error("PAIEMENT_NON_CONFIRME");
            }

            // 4. Vérifier que cette tentative est toujours la dernière.
            if (
              updatedPayment.attemptNumber !== booking.paymentAttempt
            ) {
              return {
                confirmed: false,
                stale: true,
                expired: false,
                bookingStatus: booking.status,
                walletCredited: false,
                pushNotifications: [],
              };
            }

            // 5. Ne jamais réactiver une réservation indisponible.
            if (
              booking.status === BookingStatus.EXPIRED ||
              booking.status === BookingStatus.CANCELLED ||
              booking.status === BookingStatus.REFUNDED
            ) {
              return {
                confirmed: false,
                stale: false,
                expired: booking.status === BookingStatus.EXPIRED,
                bookingStatus: booking.status,
                walletCredited: false,
                pushNotifications: [],
              };
            }

            // 6. Vérifier le délai de réservation.
            if (booking.status === BookingStatus.PENDING_PAYMENT) {
              const expirationTime =
                booking.createdAt.getTime() +
                PENDING_HOLD_MINUTES * 60 * 1000;

              if (Date.now() >= expirationTime) {
                const expired = await tx.booking.updateMany({
                  where: {
                    id: booking.id,
                    customerId,
                    status: BookingStatus.PENDING_PAYMENT,
                    paymentAttempt: updatedPayment.attemptNumber,
                  },
                  data: {
                    status: BookingStatus.EXPIRED,
                  },
                });

                if (expired.count !== 1) {
                  throw new Error("EXPIRATION_RESERVATION_ECHOUEE");
                }

                return {
                  confirmed: false,
                  stale: false,
                  expired: true,
                  bookingStatus: BookingStatus.EXPIRED,
                  walletCredited: false,
                  pushNotifications: [],
                };
              }
            }

            // 7. Confirmer uniquement une réservation en attente.
            let bookingConfirmedNow = false;

            if (booking.status === BookingStatus.PENDING_PAYMENT) {
              const updatedBooking = await tx.booking.updateMany({
                where: {
                  id: booking.id,
                  customerId,
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

            // 8. Relire la réservation après confirmation.
            const confirmedBooking = await tx.booking.findUnique({
              where: {
                id: booking.id,
              },
              select: {
                id: true,
                reference: true,
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
              !confirmedBooking.qrToken ||
              (
                confirmedBooking.status !== BookingStatus.CONFIRMED &&
                confirmedBooking.status !== BookingStatus.COMPLETED
              )
            ) {
              throw new Error("RESERVATION_NON_CONFIRMEE");
            }

            // 9. Créditer le portefeuille une seule fois.
            let walletCredited = false;

            if (
              confirmedBooking.status === BookingStatus.CONFIRMED
            ) {
              const credit = await creditBookingToPendingBalance(
                tx,
                confirmedBooking,
              );

              walletCredited = credit.credited;
            }

            // 10. Créer les notifications dans la transaction.
            const pushNotifications = bookingConfirmedNow
              ? await createBookingPaymentNotifications(tx, {
                  id: confirmedBooking.id,
                  reference: confirmedBooking.reference,
                  customerId,
                  profileId: confirmedBooking.profileId,
                })
              : [];

            return {
              confirmed: true,
              stale: false,
              expired: false,
              bookingStatus: confirmedBooking.status,
              walletCredited,
              pushNotifications,
            };
          },
          {
            isolationLevel: "Serializable",
          },
        );

      // 11. Envoyer les push après le commit.
      //
      // Une erreur push ne doit jamais annuler ni masquer
      // une confirmation de paiement déjà enregistrée.
      try {
        await sendPushNotifications(result.pushNotifications);
      } catch (pushError) {
        console.error(
          "Erreur envoi push après confirmation du paiement :",
          pushError,
        );
      }

      return {
        confirmed: result.confirmed,
        stale: result.stale,
        expired: result.expired,
        bookingStatus: result.bookingStatus,
        walletCredited: result.walletCredited,
      };
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

  throw new Error("ECHEC_REPETE_TRANSACTION_VERIFICATION");
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  await connection();

  try {
    // 1. Authentification.
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Vous devez être connecté.",
        },
        { status: 401 },
      );
    }

    if (session.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          error: "Accès réservé aux clients.",
        },
        { status: 403 },
      );
    }

    const { paymentId } = await context.params;

    if (
      typeof paymentId !== "string" ||
      !paymentId.trim() ||
      paymentId.length > 100
    ) {
      return NextResponse.json(
        {
          error: "Identifiant de paiement invalide.",
        },
        { status: 400 },
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
          error: "Compte client introuvable.",
        },
        { status: 403 },
      );
    }

    // 3. Récupérer le paiement.
    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          error: "Paiement introuvable.",
        },
        { status: 404 },
      );
    }

    if (payment.provider !== "SASPAY") {
      return NextResponse.json(
        {
          error: "Fournisseur de paiement non pris en charge.",
        },
        { status: 409 },
      );
    }

    // 4. Vérifier la propriété de la réservation.
    const ownedBooking = await prisma.booking.findFirst({
      where: {
        id: payment.bookingId,
        customerId: customer.id,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
      },
    });

    if (!ownedBooking) {
      return NextResponse.json(
        {
          error: "Vous ne pouvez pas accéder à ce paiement.",
        },
        { status: 403 },
      );
    }

    if (
      ownedBooking.amount !== payment.amount ||
      ownedBooking.currency !== payment.currency
    ) {
      return NextResponse.json(
        {
          error: "Incohérence entre le paiement et la réservation.",
        },
        { status: 409 },
      );
    }

    // 5. Configuration SasPay.
    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      console.error("SASPAY_SECRET_KEY est absente.");

      return NextResponse.json(
        {
          error: "Service de paiement indisponible.",
        },
        { status: 503 },
      );
    }

    if (!payment.providerPaymentId) {
      return NextResponse.json(
        {
          error: "Référence de paiement SasPay introuvable.",
        },
        { status: 409 },
      );
    }

    // 6. Vérification auprès de SasPay.
    let response: Response;

    try {
      response = await fetch(
        `${SASPAY_BASE_URL}/payments/${encodeURIComponent(
          payment.providerPaymentId,
        )}/verify/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        },
      );
    } catch (error) {
      console.error(
        "Erreur réseau lors de la vérification SasPay :",
        error,
      );

      return NextResponse.json(
        {
          error: "SasPay ne répond pas actuellement.",
          code: "SASPAY_UNAVAILABLE",
        },
        { status: 502 },
      );
    }

    const rawResult: unknown = await response.json().catch(() => null);

    if (!response.ok || !isRecord(rawResult)) {
      console.error("Réponse de vérification SasPay invalide :", {
        httpStatus: response.status,
        hasResponse: Boolean(rawResult),
      });

      return NextResponse.json(
        {
          error: "Impossible de vérifier le paiement auprès de SasPay.",
        },
        { status: 502 },
      );
    }

    if (rawResult.success === false) {
      console.error("SasPay a refusé la vérification :", {
        code: rawResult.code ?? null,
      });

      return NextResponse.json(
        {
          error: "SasPay n'a pas pu vérifier cette transaction.",
        },
        { status: 502 },
      );
    }

    const paymentData = isRecord(rawResult.data)
      ? rawResult.data
      : rawResult;

    // 7. Vérifier l'identité de la transaction.
    if (
      typeof paymentData.id !== "string" ||
      paymentData.id !== payment.providerPaymentId
    ) {
      return NextResponse.json(
        {
          error: "Identifiant de paiement SasPay incorrect.",
        },
        { status: 502 },
      );
    }

    if (typeof paymentData.status !== "string") {
      return NextResponse.json(
        {
          error: "Statut de paiement SasPay invalide.",
        },
        { status: 502 },
      );
    }

    const providerStatus = paymentData.status.trim().toUpperCase();

    // 8. PAIEMENT RÉUSSI.
    //
    // Pour SUCCESS, montant et devise sont obligatoires.
    if (providerStatus === "SUCCESS") {
      const validAmountAndCurrency =
        validateProviderAmountAndCurrency(
          paymentData,
          payment.amount,
          payment.currency,
          true,
        );

      if (!validAmountAndCurrency) {
        console.error("Montant ou devise SasPay incohérent.", {
          paymentId: payment.id,
        });

        return NextResponse.json(
          {
            error:
              "Le montant ou la devise confirmé par SasPay est incorrect.",
          },
          { status: 409 },
        );
      }

      const outcome = await processSuccessfulPayment(
        payment.id,
        paymentData.id as string,
        payment.amount,
        payment.currency,
        customer.id,
      );

      if (outcome.stale) {
        console.warn(
          "Ancienne tentative SasPay confirmée tardivement.",
          {
            paymentId: payment.id,
            attemptNumber: payment.attemptNumber,
          },
        );

        return NextResponse.json({
          success: true,
          status: "SUCCESS",
          bookingConfirmed: false,
          staleAttempt: true,
          walletCredited: false,
          message:
            "Paiement réussi sur une ancienne tentative. Une vérification manuelle est nécessaire.",
        });
      }

      if (outcome.expired) {
        console.warn(
          "Paiement reçu après expiration de la réservation.",
          {
            paymentId: payment.id,
            bookingId: payment.bookingId,
          },
        );

        return NextResponse.json({
          success: true,
          status: "SUCCESS",
          bookingConfirmed: false,
          bookingExpired: true,
          qrGenerated: false,
          walletCredited: false,
          message:
            "Paiement réussi, mais réservation expirée. Une intervention manuelle est nécessaire.",
        });
      }

      if (!outcome.confirmed) {
        return NextResponse.json(
          {
            success: false,
            status: "SUCCESS",
            bookingConfirmed: false,
            walletCredited: false,
            message:
              "Le paiement est réussi, mais la réservation nécessite une vérification manuelle.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        bookingConfirmed: true,
        bookingStatus: outcome.bookingStatus,
        walletCredited: outcome.walletCredited,
        message:
          outcome.bookingStatus === BookingStatus.COMPLETED
            ? "Paiement confirmé. La prestation est déjà terminée."
            : "Paiement confirmé. Votre QR code est disponible.",
      });
    }

    // 9. PAIEMENT EN ATTENTE.
    if (providerStatus === "PENDING") {
      return NextResponse.json({
        success: true,
        status: "PENDING",
        message: "Le paiement est toujours en attente.",
      });
    }

    // 10. PAIEMENT ÉCHOUÉ.
    //
    // SasPay peut ne pas retourner le montant ou la devise
    // dans une réponse d'échec.
    //
    // S'ils sont présents, ils doivent néanmoins être corrects.
    if (providerStatus === "FAILED") {
      const validOptionalAmountAndCurrency =
        validateProviderAmountAndCurrency(
          paymentData,
          payment.amount,
          payment.currency,
          false,
        );

      if (!validOptionalAmountAndCurrency) {
        console.error("Données incohérentes dans l'échec SasPay.", {
          paymentId: payment.id,
        });

        return NextResponse.json(
          {
            error: "Données de transaction SasPay incohérentes.",
          },
          { status: 409 },
        );
      }

      await transitionPaymentAndNotify(
        payment.id,
        PaymentStatus.FAILED,
      );

      return NextResponse.json({
        success: true,
        status: "FAILED",
        message:
          "Le paiement a échoué. Vous pouvez effectuer une nouvelle tentative si votre réservation est toujours valide.",
      });
    }

    // 11. PAIEMENT ANNULÉ.
    if (providerStatus === "CANCELLED") {
      const validOptionalAmountAndCurrency =
        validateProviderAmountAndCurrency(
          paymentData,
          payment.amount,
          payment.currency,
          false,
        );

      if (!validOptionalAmountAndCurrency) {
        console.error("Données incohérentes dans l'annulation SasPay.", {
          paymentId: payment.id,
        });

        return NextResponse.json(
          {
            error: "Données de transaction SasPay incohérentes.",
          },
          { status: 409 },
        );
      }

      await transitionPaymentAndNotify(
        payment.id,
        PaymentStatus.CANCELLED,
      );

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        message:
          "Le paiement a été annulé. Vous pouvez effectuer une nouvelle tentative si votre réservation est toujours valide.",
      });
    }

    // 12. STATUT INCONNU.
    //
    // Ne jamais transformer automatiquement un statut inconnu
    // en FAILED ou SUCCESS.
    console.warn("Statut SasPay non reconnu :", {
      paymentId: payment.id,
      providerStatus,
    });

    return NextResponse.json(
      {
        error: "Statut de paiement SasPay non reconnu.",
        code: "UNKNOWN_SASPAY_STATUS",
      },
      { status: 502 },
    );
  } catch (error) {
    console.error(
      "GET /api/payments/[paymentId]/verify:",
      error,
    );

    return NextResponse.json(
      {
        error: "Impossible de vérifier le paiement.",
      },
      { status: 500 },
    );
  }
}