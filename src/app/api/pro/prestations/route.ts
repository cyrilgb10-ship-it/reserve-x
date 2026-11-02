import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().int().positive(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  capacity: z.number().int().positive().default(1),
});

const updateServiceSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    price: z.number().int().positive().optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
    capacity: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune modification fournie.",
  });

async function getProfessionalProfile(userId: string) {
  return prisma.professionalProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

async function hasActiveSubscription(profileId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      profileId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return Boolean(subscription);
}

async function getJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// GET : récupérer les prestations

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 401 }
      );
    }

    const profile = await getProfessionalProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Vous devez d'abord créer votre établissement." },
        { status: 404 }
      );
    }

    const services = await prisma.service.findMany({
      where: { profileId: profile.id },
      include: {
        availabilities: {
          orderBy: { dayOfWeek: "asc" },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Erreur récupération prestations :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer vos prestations." },
      { status: 500 }
    );
  }
}

// POST : créer une prestation

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 401 }
      );
    }

    const profile = await getProfessionalProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Vous devez d'abord créer votre établissement." },
        { status: 404 }
      );
    }

    const subscriptionActive = await hasActiveSubscription(profile.id);

    if (!subscriptionActive) {
      return NextResponse.json(
        {
          error: "Votre abonnement a expiré. Veuillez le renouveler.",
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 403 }
      );
    }

    const body = await getJsonBody(request);
    const validation = serviceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Les informations de la prestation sont invalides.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        profileId: profile.id,
        name: validation.data.name,
        description: validation.data.description || null,
        price: validation.data.price,
        currency: "XOF",
        durationMinutes: validation.data.durationMinutes ?? null,
        capacity: validation.data.capacity,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Votre prestation a été créée avec succès.",
        service,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur création prestation :", error);

    return NextResponse.json(
      { error: "Impossible de créer cette prestation." },
      { status: 500 }
    );
  }
}

// PATCH : modifier une prestation ou son statut

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 401 }
      );
    }

    const profile = await getProfessionalProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Établissement introuvable." },
        { status: 404 }
      );
    }

    const body = await getJsonBody(request);

    const serviceId =
      body && typeof body === "object" && "id" in body
        ? body.id
        : null;

    if (typeof serviceId !== "string" || !serviceId.trim()) {
      return NextResponse.json(
        { error: "Identifiant de prestation invalide." },
        { status: 400 }
      );
    }

    const validation = updateServiceSchema.safeParse(
      Object.fromEntries(
        Object.entries(body).filter(([key]) => key !== "id")
      )
    );

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Les informations sont invalides.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existingService = await prisma.service.findFirst({
      where: {
        id: serviceId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Prestation introuvable." },
        { status: 404 }
      );
    }

    const data = validation.data;

    const service = await prisma.service.update({
      where: { id: existingService.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.durationMinutes !== undefined && {
          durationMinutes: data.durationMinutes,
        }),
        ...(data.capacity !== undefined && {
          capacity: data.capacity,
        }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Prestation mise à jour avec succès.",
      service,
    });
  } catch (error) {
    console.error("Erreur modification prestation :", error);

    return NextResponse.json(
      { error: "Impossible de modifier cette prestation." },
      { status: 500 }
    );
  }
}

// DELETE : désactiver une prestation sans effacer son historique

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 401 }
      );
    }

    const profile = await getProfessionalProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Établissement introuvable." },
        { status: 404 }
      );
    }

    const body = await getJsonBody(request);

    const serviceId =
      body && typeof body === "object" && "id" in body
        ? body.id
        : null;

    if (typeof serviceId !== "string" || !serviceId.trim()) {
      return NextResponse.json(
        { error: "Identifiant de prestation invalide." },
        { status: 400 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Prestation introuvable." },
        { status: 404 }
      );
    }

    await prisma.service.update({
      where: { id: service.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "La prestation a été désactivée.",
    });
  } catch (error) {
    console.error("Erreur désactivation prestation :", error);

    return NextResponse.json(
      { error: "Impossible de désactiver cette prestation." },
      { status: 500 }
    );
  }
}