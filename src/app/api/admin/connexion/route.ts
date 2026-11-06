import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const connexionSchema = z.object({
  identifier: z.string().trim().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe obligatoire"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = connexionSchema.safeParse(body);

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

    const { identifier, password } = validation.data;

    // Recherche du véritable compte dans PostgreSQL.
    const user = await prisma.user.findUnique({
      where: {
        email: identifier.toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
      },
    });

    // Vérification de l'existence du compte et de son rôle.
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    // Vérification du mot de passe.
    const passwordIsValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    // Création d'une session avec le véritable ID PostgreSQL.
    await createSession(user.id, "ADMIN");

    return NextResponse.json({
      success: true,
      message: "Connexion administrateur réussie.",
    });
  } catch (error) {
    console.error("Erreur connexion administrateur :", error);

    return NextResponse.json(
      {
        error: "Une erreur est survenue lors de la connexion.",
      },
      { status: 500 }
    );
  }
}