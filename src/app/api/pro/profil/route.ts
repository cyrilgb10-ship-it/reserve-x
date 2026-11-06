import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide.");

const businessHourSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  isOpen: z.boolean(),
  openTime: timeSchema,
  closeTime: timeSchema,
});

const profileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Le nom de l'établissement est obligatoire.")
    .max(120),

  category: z.enum([
    "HOTEL",
    "RESTAURANT",
    "EVENT",
    "VENUE",
    "PHOTOGRAPHY",
    "BEAUTY",
    "VEHICLE",
    "TRANSPORT",
    "MECHANIC",
    "TECHNICIAN",
    "ARTISAN",
    "OTHER",
  ]),

  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().max(250).optional(),

  city: z
    .string()
    .trim()
    .min(2, "La ville est obligatoire.")
    .max(100),

  country: z.string().trim().min(2).max(100).default("Togo"),

  contactEmail: z
    .union([
      z.string().trim().email("Adresse e-mail invalide."),
      z.literal(""),
    ])
    .optional(),

  contactPhone: z.string().trim().max(30).optional(),

  businessHours: z
    .array(businessHourSchema)
    .length(7, "Les horaires des sept jours sont obligatoires.")
    .optional(),
}).superRefine((data, ctx) => {
  if (!data.businessHours) return;

  const days = data.businessHours.map((hour) => hour.dayOfWeek);

  if (new Set(days).size !== 7) {
    ctx.addIssue({
      code: "custom",
      message: "Chaque jour de la semaine doit être renseigné une seule fois.",
      path: ["businessHours"],
    });
  }

  data.businessHours.forEach((hour, index) => {
    if (hour.isOpen && hour.closeTime <= hour.openTime) {
      ctx.addIssue({
        code: "custom",
        message: "L'heure de fermeture doit être après l'heure d'ouverture.",
        path: ["businessHours", index, "closeTime"],
      });
    }
  });
});

function createSlug(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const suffix = randomBytes(3).toString("hex");

  return `${base || "etablissement"}-${suffix}`;
}

function getTrialDates() {
  const startsAt = new Date();
  const expiresAt = new Date(startsAt);

  expiresAt.setDate(expiresAt.getDate() + 30);

  return { startsAt, expiresAt };
}

// GET : récupérer le profil et ses horaires
export async function GET() {
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
        businessName: true,
        slug: true,
        category: true,
        description: true,
        address: true,
        city: true,
        country: true,
        contactEmail: true,
        contactPhone: true,
        isPublished: true,
        blueBadgeAt: true,
        createdAt: true,
        updatedAt: true,

        businessHours: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Erreur récupération du profil :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer votre établissement." },
      { status: 500 }
    );
  }
}

// POST : créer ou mettre à jour le profil
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Le contenu de la requête est invalide." },
        { status: 400 }
      );
    }

    const validation = profileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Informations invalides.",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const profile = await prisma.$transaction(
      async (tx) => {
        const existingProfile =
          await tx.professionalProfile.findUnique({
            where: {
              userId: session.userId,
            },
            select: {
              id: true,
            },
          });

        let savedProfile;

        // Mise à jour du profil existant
        if (existingProfile) {
          savedProfile = await tx.professionalProfile.update({
            where: {
              id: existingProfile.id,
            },
            data: {
              businessName: data.businessName,
              category: data.category,
              description: data.description || null,
              address: data.address || null,
              city: data.city,
              country: data.country,
              contactEmail: data.contactEmail || null,
              contactPhone: data.contactPhone || null,
            },
          });

          // Garantir l'existence du portefeuille
          await tx.wallet.upsert({
            where: {
              profileId: existingProfile.id,
            },
            create: {
              profileId: existingProfile.id,
            },
            update: {},
          });

          // Vérifier si un abonnement existe déjà
          const previousSubscription =
            await tx.subscription.findFirst({
              where: {
                profileId: existingProfile.id,
              },
              select: {
                id: true,
              },
            });

          // Accorder l'essai uniquement si aucun abonnement
          // n'a jamais été enregistré pour ce profil.
          if (!previousSubscription) {
            const { startsAt, expiresAt } = getTrialDates();

            await tx.subscription.create({
              data: {
                profileId: existingProfile.id,
                plan: "BASIC",
                status: "ACTIVE",
                amount: 0,
                startsAt,
                expiresAt,
              },
            });
          }
        } else {
          // Création du profil
          const { startsAt, expiresAt } = getTrialDates();

          savedProfile = await tx.professionalProfile.create({
            data: {
              userId: session.userId,
              businessName: data.businessName,
              slug: createSlug(data.businessName),
              category: data.category,
              description: data.description || null,
              address: data.address || null,
              city: data.city,
              country: data.country,
              contactEmail: data.contactEmail || null,
              contactPhone: data.contactPhone || null,

              wallet: {
                create: {
                  availableBalance: 0,
                  pendingBalance: 0,
                  totalEarned: 0,
                  totalWithdrawn: 0,
                },
              },

              subscriptions: {
                create: {
                  plan: "BASIC",
                  status: "ACTIVE",
                  amount: 0,
                  startsAt,
                  expiresAt,
                },
              },
            },
          });
        }

        // Enregistrer les horaires s'ils sont fournis
        if (data.businessHours) {
          await tx.businessHour.deleteMany({
            where: {
              profileId: savedProfile.id,
            },
          });

          await tx.businessHour.createMany({
            data: data.businessHours.map((hour) => ({
              profileId: savedProfile.id,
              dayOfWeek: hour.dayOfWeek,
              isOpen: hour.isOpen,
              openTime: hour.openTime,
              closeTime: hour.closeTime,
            })),
          });
        }

        return tx.professionalProfile.findUniqueOrThrow({
          where: {
            id: savedProfile.id,
          },
          include: {
            businessHours: {
              orderBy: {
                dayOfWeek: "asc",
              },
            },
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Votre établissement a été enregistré avec succès.",
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur enregistrement établissement :", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "Un établissement utilise déjà ces informations.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Une erreur est survenue lors de l'enregistrement.",
      },
      { status: 500 }
    );
  }
}