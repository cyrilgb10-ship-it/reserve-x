import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ======================================================
// CONFIGURATION
// ======================================================

const SUBSCRIPTION_PRICE = 2000;
const SUBSCRIPTION_DURATION_DAYS = 30;

const SASPAY_BASE_URL = (
  process.env.SASPAY_API_URL || "https://api.saspay.me/api/v1"
).replace(/\/+$/, "");

const PAYMENT_TIMEOUT = 15000;

// ======================================================
// VALIDATION
// ======================================================

const paymentSchema = z.object({
  network: z.enum(["togocel", "moov_tg"]),

  phone: z
    .string()
    .trim()
    .min(8, "Numéro de téléphone invalide.")
    .max(20, "Numéro de téléphone invalide.")
    .transform((value) => value.replace(/[\s().-]/g, ""))
    .refine(
      (value) => /^\+?[0-9]{8,15}$/.test(value),
      "Numéro de téléphone invalide."
    ),
});

// ======================================================
// TYPES SASPAY
// ======================================================

type SasPayStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "UNKNOWN";

type SasPayResult = {
  success?: boolean;
  message?: string;

  data?: {
    id?: string;
    status?: string;
    payment_status?: string;
    transaction_status?: string;
    checkout_url?: string;
    checkoutUrl?: string;

    payment?: {
      checkout_url?: string;
      checkoutUrl?: string;
    };
  };

  status?: string;
  payment_status?: string;
  transaction_status?: string;

  [key: string]: unknown;
};

// ======================================================
// NORMALISATION DU STATUT SASPAY
// ======================================================

function normalizeSasPayStatus(value: unknown): SasPayStatus {
  if (typeof value !== "string") {
    return "UNKNOWN";
  }

  const status = value.trim().toUpperCase();

  if (
    [
      "SUCCESS",
      "SUCCESSFUL",
      "COMPLETED",
      "PAID",
      "APPROVED",
    ].includes(status)
  ) {
    return "SUCCESS";
  }

  if (
    [
      "FAILED",
      "FAILURE",
      "ERROR",
      "REJECTED",
      "DECLINED",
    ].includes(status)
  ) {
    return "FAILED";
  }

  if (
    [
      "CANCELLED",
      "CANCELED",
      "ABORTED",
      "EXPIRED",
    ].includes(status)
  ) {
    return "CANCELLED";
  }

  if (
    [
      "REFUNDED",
      "REFUND",
    ].includes(status)
  ) {
    return "REFUNDED";
  }

  if (
    [
      "PENDING",
      "PROCESSING",
      "INITIATED",
      "IN_PROGRESS",
      "WAITING",
    ].includes(status)
  ) {
    return "PENDING";
  }

  return "UNKNOWN";
}

// ======================================================
// EXTRACTION DU STATUT SASPAY
// ======================================================

function extractSasPayStatus(
  result: SasPayResult
): SasPayStatus {
  const candidates = [
    result.data?.status,
    result.data?.payment_status,
    result.data?.transaction_status,

    result.status,
    result.payment_status,
    result.transaction_status,
  ];

  for (const candidate of candidates) {
    const status = normalizeSasPayStatus(candidate);

    if (status !== "UNKNOWN") {
      return status;
    }
  }

  return "UNKNOWN";
}

// ======================================================
// CONVERSION DU STATUT
// ======================================================

function toLocalPaymentStatus(
  status: SasPayStatus
): PaymentStatus | null {
  switch (status) {
    case "SUCCESS":
      return PaymentStatus.SUCCESS;

    case "FAILED":
      return PaymentStatus.FAILED;

    case "CANCELLED":
      return PaymentStatus.CANCELLED;

    case "REFUNDED":
      return PaymentStatus.REFUNDED;

    case "PENDING":
      return PaymentStatus.PENDING;

    default:
      return null;
  }
}

// ======================================================
// VÉRIFICATION SASPAY
// ======================================================

async function verifySasPayPayment(
  providerPaymentId: string,
  secretKey: string
): Promise<SasPayStatus> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    PAYMENT_TIMEOUT
  );

  try {
    const response = await fetch(
      `${SASPAY_BASE_URL}/payments/${encodeURIComponent(
        providerPaymentId
      )}/verify/`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },

        cache: "no-store",
        signal: controller.signal,
      }
    );

    const result = (await response.json()) as SasPayResult;

    console.log(
      "[Reserve X] Vérification SasPay :",
      providerPaymentId,
      result
    );

    if (!response.ok) {
      console.error(
        "[Reserve X] Erreur SasPay :",
        response.status,
        result
      );

      return "UNKNOWN";
    }

    return extractSasPayStatus(result);
  } catch (error) {
    console.error(
      "[Reserve X] Erreur de vérification :",
      error
    );

    return "UNKNOWN";
  } finally {
    clearTimeout(timeout);
  }
}

// ======================================================
// ACTIVATION DE L'ABONNEMENT
// ======================================================

async function activateSubscription(
  paymentId: string
): Promise<void> {
  const now = new Date();

  // Identifiant unique et déterministe :
  // un paiement ne peut créer qu'un abonnement.
  const subscriptionId = `sub_${paymentId}`;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      return;
    }

    // Seuls les paiements PENDING ou SUCCESS
    // peuvent conduire à une activation.
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.SUCCESS
    ) {
      return;
    }

    // Vérifier si cet abonnement existe déjà.
    const existingSubscription =
      await tx.subscription.findUnique({
        where: {
          id: subscriptionId,
        },
      });

    if (existingSubscription) {
      return;
    }

    // Confirmer le paiement si nécessaire.
    if (payment.status === PaymentStatus.PENDING) {
      const updated = await tx.subscriptionPayment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.PENDING,
        },

        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: payment.paidAt ?? now,
          verifiedAt: now,
        },
      });

      // Une autre requête a éventuellement déjà traité
      // ce paiement. On ne crée rien dans ce cas.
      if (updated.count === 0) {
        return;
      }
    }

    // Chercher le dernier abonnement actif.
    const latestSubscription =
      await tx.subscription.findFirst({
        where: {
          profileId: payment.profileId,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: {
            gt: now,
          },
        },

        orderBy: {
          expiresAt: "desc",
        },
      });

    const paymentDate = payment.paidAt ?? now;

    // Si un abonnement est encore actif, le nouveau
    // commence à son expiration.
    const startsAt =
      latestSubscription &&
      latestSubscription.expiresAt > paymentDate
        ? latestSubscription.expiresAt
        : paymentDate;

    const expiresAt = new Date(startsAt);

    expiresAt.setDate(
      expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS
    );

    // Création avec un identifiant déterministe.
    await tx.subscription.upsert({
      where: {
        id: subscriptionId,
      },

      create: {
        id: subscriptionId,
        profileId: payment.profileId,
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
        amount: payment.amount,
        startsAt,
        expiresAt,
      },

      // Ne jamais réinitialiser un abonnement existant.
      update: {},
    });

    console.log(
      "[Reserve X] Abonnement activé :",
      payment.profileId,
      expiresAt
    );
  });
}

// ======================================================
// SYNCHRONISATION D'UN PAIEMENT
// ======================================================

async function synchronizePayment(
  paymentId: string,
  secretKey: string
): Promise<void> {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: {
      id: paymentId,
    },
  });

  if (!payment || !payment.providerPaymentId) {
    return;
  }

  // Les statuts terminaux ne doivent pas être écrasés.
  if (
    payment.status === PaymentStatus.FAILED ||
    payment.status === PaymentStatus.CANCELLED ||
    payment.status === PaymentStatus.REFUNDED
  ) {
    return;
  }

  // Réparer une éventuelle activation incomplète
  // d'un paiement déjà confirmé.
  if (payment.status === PaymentStatus.SUCCESS) {
    await activateSubscription(payment.id);
    return;
  }

  const sasPayStatus = await verifySasPayPayment(
    payment.providerPaymentId,
    secretKey
  );

  const localStatus = toLocalPaymentStatus(sasPayStatus);

  // Réponse inconnue : ne rien modifier.
  if (!localStatus) {
    return;
  }

  // Toujours en attente.
  if (localStatus === PaymentStatus.PENDING) {
    return;
  }

  // Paiement confirmé.
  if (localStatus === PaymentStatus.SUCCESS) {
    await activateSubscription(payment.id);
    return;
  }

  // Paiement échoué, annulé ou remboursé.
  await prisma.subscriptionPayment.updateMany({
    where: {
      id: payment.id,
      status: PaymentStatus.PENDING,
    },

    data: {
      status: localStatus,
      verifiedAt: new Date(),
    },
  });
}

// ======================================================
// RÉPONSE D'ERREUR
// ======================================================

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    }
  );
}

// ======================================================
// GET : RÉCUPÉRATION ET SYNCHRONISATION
// ======================================================

export async function GET() {
  await connection();

  try {
    // AUTHENTIFICATION
    const session = await getSession();

    if (!session?.userId) {
      return errorResponse(
        "Vous devez être connecté.",
        401
      );
    }

    if (session.role !== "PROFESSIONAL") {
      return errorResponse(
        "Accès réservé aux professionnels.",
        403
      );
    }

    // PROFIL
    const profile = await prisma.professionalProfile.findUnique({
      where: {
        userId: session.userId,
      },

      select: {
        id: true,
        businessName: true,
      },
    });

    if (!profile) {
      return errorResponse(
        "Profil professionnel introuvable.",
        404
      );
    }

    // --------------------------------------------------
    // SYNCHRONISATION AUTOMATIQUE SASPAY
    // --------------------------------------------------

    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (secretKey) {
      const pendingPayments =
        await prisma.subscriptionPayment.findMany({
          where: {
            profileId: profile.id,
            status: PaymentStatus.PENDING,
            providerPaymentId: {
              not: null,
            },
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 20,

          select: {
            id: true,
          },
        });

      for (const payment of pendingPayments) {
        try {
          await synchronizePayment(
            payment.id,
            secretKey
          );
        } catch (error) {
          console.error(
            "[Reserve X] Synchronisation impossible :",
            payment.id,
            error
          );
        }
      }
    }

    // --------------------------------------------------
    // EXPIRATION DES ABONNEMENTS
    // --------------------------------------------------

    const now = new Date();

    await prisma.subscription.updateMany({
      where: {
        profileId: profile.id,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          lte: now,
        },
      },

      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    // --------------------------------------------------
    // ABONNEMENTS
    // --------------------------------------------------

    const subscriptions = await prisma.subscription.findMany({
      where: {
        profileId: profile.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 20,
    });

    const currentSubscription =
      subscriptions.find(
        (subscription) =>
          subscription.status === SubscriptionStatus.ACTIVE &&
          subscription.expiresAt > now
      ) ?? null;

    // --------------------------------------------------
    // PROCHAIN ABONNEMENT
    // --------------------------------------------------

    const upcomingSubscription =
      subscriptions.find(
        (subscription) =>
          currentSubscription !== null &&
          subscription.id !== currentSubscription.id &&
          subscription.startsAt >= currentSubscription.expiresAt
      ) ?? null;

    // --------------------------------------------------
    // PAIEMENT EN ATTENTE
    // --------------------------------------------------

    const pendingPayment =
      await prisma.subscriptionPayment.findFirst({
        where: {
          profileId: profile.id,
          status: PaymentStatus.PENDING,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          providerPaymentId: true,
          amount: true,
          currency: true,
          network: true,
          customerPhone: true,
          status: true,
          createdAt: true,
        },
      });

    // --------------------------------------------------
    // HISTORIQUE DES PAIEMENTS
    // --------------------------------------------------

    const paymentHistory =
      await prisma.subscriptionPayment.findMany({
        where: {
          profileId: profile.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 20,

        select: {
          id: true,
          providerPaymentId: true,
          amount: true,
          currency: true,
          status: true,
          network: true,
          customerPhone: true,
          paidAt: true,
          verifiedAt: true,
          createdAt: true,
        },
      });

    // --------------------------------------------------
    // JOURS RESTANTS
    // --------------------------------------------------

    let daysRemaining = 0;

    if (currentSubscription) {
      const difference =
        currentSubscription.expiresAt.getTime() -
        now.getTime();

      daysRemaining = Math.max(
        0,
        Math.ceil(
          difference / (1000 * 60 * 60 * 24)
        )
      );
    }

    // --------------------------------------------------
    // RÉPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      profile,

      pricing: {
        amount: SUBSCRIPTION_PRICE,
        currency: "XOF",
        durationDays: SUBSCRIPTION_DURATION_DAYS,
      },

      subscription: currentSubscription,

      upcomingSubscription,

      subscriptions,

      pendingPayment,

      paymentHistory,

      payments: paymentHistory,

      daysRemaining,

      isActive: Boolean(currentSubscription),

      isTrial: false,
    });
  } catch (error) {
    console.error(
      "[Reserve X] GET abonnement :",
      error
    );

    return errorResponse(
      "Impossible de récupérer les informations de votre abonnement.",
      500
    );
  }
}

// ======================================================
// POST : INITIALISATION DU PAIEMENT
// ======================================================

export async function POST(request: NextRequest) {
  await connection();

  let createdPaymentId: string | null = null;

  try {
    // --------------------------------------------------
    // AUTHENTIFICATION
    // --------------------------------------------------

    const session = await getSession();

    if (!session?.userId) {
      return errorResponse(
        "Vous devez être connecté.",
        401
      );
    }

    if (session.role !== "PROFESSIONAL") {
      return errorResponse(
        "Accès réservé aux professionnels.",
        403
      );
    }

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    const body = await request.json();

    const validation = paymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,

          message:
            validation.error.issues[0]?.message ??
            "Informations invalides.",
        },
        {
          status: 400,
        }
      );
    }

    const { network, phone } = validation.data;

    // --------------------------------------------------
    // CONFIGURATION SASPAY
    // --------------------------------------------------

    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "[Reserve X] SASPAY_SECRET_KEY manquante."
      );

      return errorResponse(
        "Le service de paiement est momentanément indisponible.",
        500
      );
    }

    // --------------------------------------------------
    // RÉCUPÉRATION DU PROFIL ET DE L'UTILISATEUR
    // --------------------------------------------------

    const [profile, user] = await Promise.all([
      prisma.professionalProfile.findUnique({
        where: {
          userId: session.userId,
        },
      }),

      prisma.user.findUnique({
        where: {
          id: session.userId,
        },

        select: {
          name: true,
          email: true,
        },
      }),
    ]);

    if (!profile || !user) {
      return errorResponse(
        "Profil professionnel introuvable.",
        404
      );
    }

    // --------------------------------------------------
    // VÉRIFICATION D'UN PAIEMENT EN ATTENTE
    // --------------------------------------------------

    const oldPendingPayment =
      await prisma.subscriptionPayment.findFirst({
        where: {
          profileId: profile.id,
          status: PaymentStatus.PENDING,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (oldPendingPayment) {
      if (oldPendingPayment.providerPaymentId) {
        await synchronizePayment(
          oldPendingPayment.id,
          secretKey
        );
      }

      const refreshedPayment =
        await prisma.subscriptionPayment.findUnique({
          where: {
            id: oldPendingPayment.id,
          },
        });

      if (
        refreshedPayment?.status === PaymentStatus.PENDING
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Un paiement est toujours en cours. Termine ou annule la demande sur ton téléphone avant de recommencer.",

            pendingPayment: refreshedPayment,
          },
          {
            status: 409,
          }
        );
      }
    }

    // --------------------------------------------------
    // INFORMATIONS CLIENT
    // --------------------------------------------------

    const fullName = (
      user.name || "Professionnel Reserve X"
    ).trim();

    const nameParts = fullName.split(/\s+/);

    const firstName = nameParts[0] || "Professionnel";

    const lastName =
      nameParts.slice(1).join(" ") || "Reserve X";

    const email =
      user.email || "contact@reserve-x.com";

    // --------------------------------------------------
    // CRÉATION DU PAIEMENT LOCAL
    // --------------------------------------------------

    const payment = await prisma.subscriptionPayment.create({
      data: {
        profileId: profile.id,
        provider: "SASPAY",
        amount: SUBSCRIPTION_PRICE,
        currency: "XOF",
        status: PaymentStatus.PENDING,
        network,
        customerPhone: phone,
      },
    });

    createdPaymentId = payment.id;

    // --------------------------------------------------
    // INITIALISATION SASPAY
    // --------------------------------------------------

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      30000
    );

    let response: Response;

    try {
      response = await fetch(
        `${SASPAY_BASE_URL}/payments/softpay/`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "Idempotency-Key": payment.id,
          },

          body: JSON.stringify({
            amount: String(SUBSCRIPTION_PRICE),
            currency: "XOF",
            country: "TG",

            description: `Abonnement Reserve X - ${profile.businessName} - 30 jours`,

            customer: {
              email,
              first_name: firstName,
              last_name: lastName,
              phone,
            },

            network,

            metadata: {
              type: "SUBSCRIPTION",
              profileId: profile.id,
              subscriptionPaymentId: payment.id,
              businessName: profile.businessName,
            },

            fee_charge_mode: "ADD_ON",
          }),

          cache: "no-store",
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const result = (await response.json()) as SasPayResult;

    console.log(
      "[Reserve X] Réponse initialisation SasPay :",
      result
    );

    // --------------------------------------------------
    // TRAITEMENT DE LA RÉPONSE
    // --------------------------------------------------

    const providerPaymentId =
      typeof result.data?.id === "string"
        ? result.data.id
        : null;

    if (
      !response.ok ||
      result.success !== true ||
      !providerPaymentId
    ) {
      await prisma.subscriptionPayment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: PaymentStatus.FAILED,
          verifiedAt: new Date(),
        },
      });

      createdPaymentId = null;

      console.error(
        "[Reserve X] Échec initialisation SasPay :",
        response.status,
        result
      );

      return errorResponse(
        typeof result.message === "string"
          ? result.message
          : "Impossible d'initialiser le paiement.",
        502
      );
    }

    // --------------------------------------------------
    // ENREGISTREMENT SASPAY
    // --------------------------------------------------

    const initialStatus = extractSasPayStatus(result);

    const localStatus = toLocalPaymentStatus(initialStatus);

    await prisma.subscriptionPayment.update({
      where: {
        id: payment.id,
      },

      data: {
        providerPaymentId,

        status:
          localStatus ?? PaymentStatus.PENDING,

        paidAt:
          initialStatus === "SUCCESS"
            ? new Date()
            : null,

        verifiedAt:
          initialStatus === "SUCCESS" ||
          initialStatus === "FAILED" ||
          initialStatus === "CANCELLED" ||
          initialStatus === "REFUNDED"
            ? new Date()
            : null,
      },
    });

    // --------------------------------------------------
    // ACTIVATION SI PAIEMENT IMMÉDIATEMENT CONFIRMÉ
    // --------------------------------------------------

    if (initialStatus === "SUCCESS") {
      await activateSubscription(payment.id);
    }

    // --------------------------------------------------
    // LIEN DE PAIEMENT
    // --------------------------------------------------

    const checkoutUrl =
      result.data?.checkoutUrl ??
      result.data?.checkout_url ??
      result.data?.payment?.checkoutUrl ??
      result.data?.payment?.checkout_url ??
      null;

    // --------------------------------------------------
    // RÉPONSE
    // --------------------------------------------------

    createdPaymentId = null;

    return NextResponse.json({
      success: true,

      message:
        initialStatus === "SUCCESS"
          ? "Paiement confirmé. Votre abonnement est activé."
          : "Demande de paiement envoyée. Confirme le paiement sur ton téléphone.",

      payment: {
        id: payment.id,
        providerPaymentId,
        amount: SUBSCRIPTION_PRICE,
        currency: "XOF",
        status: localStatus ?? PaymentStatus.PENDING,
        network,
        customerPhone: phone,
        checkoutUrl,
      },
    });
  } catch (error) {
    console.error(
      "[Reserve X] POST abonnement :",
      error
    );

    // En cas de délai dépassé ou d'erreur réseau,
    // ne pas inventer un statut FAILED.
    // SasPay peut avoir reçu la demande.

    return errorResponse(
      "Une erreur est survenue lors de l'initialisation du paiement. Vérifie ton historique avant de recommencer.",
      500
    );
  }
}