import {
  NotificationType,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

type TransactionClient = Prisma.TransactionClient;

export type PushNotificationInput = {
  userId: string;
  title: string;
  message: string;
  url: string;
  tag: string;
};

type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  dedupeKey: string;
};

export async function createNotificationOnce(
  tx: TransactionClient,
  input: CreateNotificationInput,
): Promise<boolean> {
  const result = await tx.notification.createMany({
    data: [
      {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        dedupeKey: input.dedupeKey,
      },
    ],
    skipDuplicates: true,
  });

  return result.count === 1;
}

export async function createBookingPaymentNotifications(
  tx: TransactionClient,
  booking: {
    id: string;
    reference: string;
    customerId: string;
    profileId: string;
  },
): Promise<PushNotificationInput[]> {
  const notifications: PushNotificationInput[] = [];

  // Notification du client.
  const customerKey = `booking-confirmed:${booking.id}:customer`;

  const customerCreated = await createNotificationOnce(tx, {
    userId: booking.customerId,
    title: "Réservation confirmée",
    message: `Votre réservation ${booking.reference} est confirmée. Votre QR code est disponible dans Mes tickets.`,
    type: NotificationType.BOOKING,
    dedupeKey: customerKey,
  });

  if (customerCreated) {
    notifications.push({
      userId: booking.customerId,
      title: "Réservation confirmée",
      message: `Votre réservation ${booking.reference} est confirmée. Retrouvez votre QR code dans Mes tickets.`,
      url: "/client/tickets",
      tag: customerKey,
    });
  }

  // Récupérer le propriétaire de l'établissement.
  const profile = await tx.professionalProfile.findUnique({
    where: {
      id: booking.profileId,
    },
    select: {
      userId: true,
      businessName: true,
    },
  });

  if (profile) {
    const professionalKey = `booking-paid:${booking.id}:professional`;

    const professionalCreated = await createNotificationOnce(tx, {
      userId: profile.userId,
      title: "Nouvelle réservation payée",
      message: `La réservation ${booking.reference} vient d'être payée.`,
      type: NotificationType.PAYMENT,
      dedupeKey: professionalKey,
    });

    if (professionalCreated) {
      notifications.push({
        userId: profile.userId,
        title: "Nouvelle réservation payée",
        message: `La réservation ${booking.reference} vient d'être payée.`,
        url: "/pro/reservations",
        tag: professionalKey,
      });
    }
  }

  return notifications;
}

/**
 * Enregistre un échec ou une annulation uniquement si le paiement
 * était encore PENDING.
 *
 * Le changement de statut et la notification sont atomiques.
 * Le push est envoyé après la validation de la transaction.
 */
export async function transitionPaymentAndNotify(
  paymentId: string,
  targetStatus: typeof PaymentStatus.FAILED | typeof PaymentStatus.CANCELLED,
): Promise<boolean> {
  const notification = await prisma.$transaction(async (tx) => {
    const transition = await tx.payment.updateMany({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: targetStatus,
        verifiedAt: new Date(),
      },
    });

    if (transition.count !== 1) {
      return null;
    }

    const payment = await tx.payment.findUnique({
      where: {
        id: paymentId,
      },
      select: {
        booking: {
          select: {
            customerId: true,
            reference: true,
          },
        },
      },
    });

    if (!payment?.booking) {
      return null;
    }

    const isFailed = targetStatus === PaymentStatus.FAILED;

    const title = isFailed
      ? "Paiement échoué"
      : "Paiement annulé";

    const message = isFailed
      ? `Le paiement de votre réservation ${payment.booking.reference} a échoué. Vous pouvez effectuer une nouvelle tentative si votre réservation est toujours valide.`
      : `Le paiement de votre réservation ${payment.booking.reference} a été annulé. Vous pouvez effectuer une nouvelle tentative si votre réservation est toujours valide.`;

    const dedupeKey = `payment-${targetStatus.toLowerCase()}:${paymentId}`;

    const created = await createNotificationOnce(tx, {
      userId: payment.booking.customerId,
      title,
      message,
      type: NotificationType.PAYMENT,
      dedupeKey,
    });

    if (!created) {
      return null;
    }

    return {
      userId: payment.booking.customerId,
      title,
      message,
      url: "/client/tickets",
      tag: dedupeKey,
    };
  });

  if (notification) {
    await sendPushToUser(notification.userId, {
      title: notification.title,
      message: notification.message,
      url: notification.url,
      tag: notification.tag,
    });
  }

  return notification !== null;
}

/**
 * Envoie les notifications push après la validation
 * de la transaction métier.
 */
export async function sendPushNotifications(
  notifications: PushNotificationInput[],
): Promise<void> {
  await Promise.all(
    notifications.map(async (notification) => {
      await sendPushToUser(notification.userId, {
        title: notification.title,
        message: notification.message,
        url: notification.url,
        tag: notification.tag,
      });
    }),
  );
}