import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const inscriptionSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),

  email: z
    .string()
    .trim()
    .email("Adresse e-mail invalide")
    .max(150),

  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .refine(
      (value) => /^\+?[0-9]{8,15}$/.test(value),
      "Numéro de téléphone invalide"
    ),

  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = inscriptionSchema.safeParse(body);

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
    const email = data.email.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone: data.phone },
        ],
      },
      select: {
        email: true,
        phone: true,
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: "Cette adresse e-mail est déjà utilisée." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Ce numéro de téléphone est déjà utilisé." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        phone: data.phone,
        passwordHash,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await createSession(user.id, user.role);

    return NextResponse.json(
      {
        success: true,
        message: "Votre compte client a été créé.",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "Cette adresse e-mail ou ce numéro de téléphone est déjà utilisé.",
        },
        { status: 409 }
      );
    }

    console.error("Erreur inscription client :", error);

    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription." },
      { status: 500 }
    );
  }
}