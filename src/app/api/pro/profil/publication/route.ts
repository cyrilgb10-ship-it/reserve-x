import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 401 }
      );
    }

    const profile = await prisma.professionalProfile.findUnique({
      where: {
        userId: session.userId,
      },
      select: {
        id: true,
        isPublished: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Vous devez d'abord créer votre établissement." },
        { status: 404 }
      );
    }

    const now = new Date();

    const subscription = await prisma.subscription.findFirst({
      where: {
        profileId: profile.id,
        status: "ACTIVE",
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        expiresAt: "desc",
      },
      select: {
        id: true,
        plan: true,
        expiresAt: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          error: "Votre abonnement a expiré. Veuillez renouveler votre abonnement pour publier votre établissement.",
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 403 }
      );
    }

    if (profile.isPublished) {
      return NextResponse.json({
        success: true,
        message: "Votre établissement est déjà publié.",
      });
    }

    await prisma.professionalProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        isPublished: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Félicitations ! Votre établissement est maintenant publié.",
      published: true,
      plan: subscription.plan,
      expiresAt: subscription.expiresAt,
    });
  } catch (error) {
    console.error("Erreur publication établissement :", error);

    return NextResponse.json(
      { error: "Impossible de publier votre établissement pour le moment." },
      { status: 500 }
    );
  }
}