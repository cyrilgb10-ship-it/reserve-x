import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const customFieldSchema = z.object({
  label: z.string().trim().min(2).max(100),
  type: z.enum([
    "TEXT",
    "NUMBER",
    "PHONE",
    "EMAIL",
    "SELECT",
    "CHECKBOX",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).max(30).optional(),
});

const customFieldsSchema = z
  .array(customFieldSchema)
  .max(15)
  .optional()
  .refine(
    (fields) => {
      if (!fields) return true;

      const labels = fields.map((field) =>
        field.label.toLowerCase()
      );

      return new Set(labels).size === labels.length;
    },
    {
      message: "Les noms des champs doivent être uniques.",
    }
  )
  .refine(
    (fields) => {
      if (!fields) return true;

      return fields.every(
        (field) =>
          field.type !== "SELECT" ||
          (field.options && field.options.length > 0)
      );
    },
    {
      message: "Chaque liste déroulante doit avoir des options.",
    }
  );

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().int().positive(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  capacity: z.number().int().positive().default(1),
  customFields: customFieldsSchema,
});

const updateServiceSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    price: z.number().int().positive().optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
    capacity: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    customFields: customFieldsSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune modification fournie.",
  });

async function getProfessionalProfile(userId: string) {
  return prisma.professionalProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      category: true,
    },
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

function prepareCustomFields(
  fields:
    | z.infer<typeof customFieldSchema>[]
    | undefined
) {
  if (!fields) return [];

  return fields.map((field) => ({
    label: field.label,
    type: field.type,
    required: field.required,
    options:
      field.type === "SELECT" && field.options
        ? field.options
        : undefined,
  }));
}

// GET : récupérer les prestations et la catégorie du professionnel

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
        customFields: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      category: profile.category,
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

// POST : créer une prestation avec ses champs personnalisés

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

    const data = validation.data;

    const service = await prisma.service.create({
      data: {
        profileId: profile.id,
        name: data.name,
        description: data.description || null,
        price: data.price,
        currency: "XOF",
        durationMinutes: data.durationMinutes ?? null,
        capacity: data.capacity,
        customFields: {
          create: prepareCustomFields(data.customFields),
        },
      },
      include: {
        customFields: true,
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

// PATCH : modifier une prestation

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
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Prestation introuvable." },
        { status: 404 }
      );
    }

    const data = validation.data;

    if (
      data.customFields !== undefined &&
      existingService._count.bookings > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Les champs personnalisés ne peuvent plus être modifiés après une première réservation.",
          code: "CUSTOM_FIELDS_LOCKED",
        },
        { status: 409 }
      );
    }

    const service = await prisma.$transaction(async (tx) => {
      if (data.customFields !== undefined) {
        await tx.customField.deleteMany({
          where: { serviceId: existingService.id },
        });
      }

      return tx.service.update({
        where: { id: existingService.id },
        data: {
          ...(data.name !== undefined && {
            name: data.name,
          }),
          ...(data.description !== undefined && {
            description: data.description || null,
          }),
          ...(data.price !== undefined && {
            price: data.price,
          }),
          ...(data.durationMinutes !== undefined && {
            durationMinutes: data.durationMinutes,
          }),
          ...(data.capacity !== undefined && {
            capacity: data.capacity,
          }),
          ...(data.isActive !== undefined && {
            isActive: data.isActive,
          }),
          ...(data.customFields !== undefined && {
            customFields: {
              create: prepareCustomFields(data.customFields),
            },
          }),
        },
        include: {
          customFields: true,
        },
      });
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