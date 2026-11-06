import webpush from "web-push";
import type { PushSubscription as WebPushSubscription } from "web-push";

import { prisma } from "@/lib/prisma";

export type PushPayload = {
  title: string;
  message: string;
  url?: string;
  tag?: string;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Configuration VAPID incomplète.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    configureWebPush();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        const pushSubscription: WebPushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload),
          );
        } catch (error: unknown) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;

          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.deleteMany({
              where: { id: subscription.id },
            });
          } else {
            console.error(
              "Échec de livraison d'une notification push.",
              statusCode ?? "Erreur inconnue",
            );
          }
        }
      }),
    );
  } catch (error) {
    // Une erreur push ne doit jamais interrompre une opération métier.
    console.error("Service push indisponible :", error);
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  const uniqueUserIds = [...new Set(userIds)];

  await Promise.all(
    uniqueUserIds.map((userId) => sendPushToUser(userId, payload)),
  );
}