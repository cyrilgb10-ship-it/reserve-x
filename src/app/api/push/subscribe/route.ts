import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = subscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Abonnement push invalide." },
        { status: 400 },
      );
    }

    const { endpoint, keys } = parsed.data;

    if (!endpoint.startsWith("https://")) {
      return NextResponse.json(
        { error: "Endpoint sécurisé obligatoire." },
        { status: 400 },
      );
    }

    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing && existing.userId !== session.userId) {
      return NextResponse.json(
        { error: "Cet appareil est déjà associé à un autre compte." },
        { status: 409 },
      );
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: session.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 500),
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 500),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notifications activées.",
    });
  } catch (error) {
    console.error("Erreur abonnement push :", error);

    return NextResponse.json(
      { error: "Impossible d'activer les notifications." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const endpoint =
      typeof body?.endpoint === "string" ? body.endpoint : null;

    if (!endpoint || endpoint.length > 4096) {
      return NextResponse.json(
        { error: "Endpoint invalide." },
        { status: 400 },
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.userId,
        endpoint,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notifications désactivées.",
    });
  } catch (error) {
    console.error("Erreur désabonnement push :", error);

    return NextResponse.json(
      { error: "Impossible de désactiver les notifications." },
      { status: 500 },
    );
  }
}