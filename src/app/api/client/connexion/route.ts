import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const connexionSchema = z.object({
  identifier: z.string().trim().min(1, "Identifiant obligatoire"),
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

    const normalizedIdentifier = identifier.toLowerCase();
    const normalizedPhone = identifier.replace(/[\s()-]/g, "");

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { phone: normalizedPhone },
        ],
      },
    });

    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

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

    await createSession(user.id, user.role);

    return NextResponse.json({
      success: true,
      message: "Connexion réussie.",
    });
  } catch (error) {
    console.error("Erreur connexion client :", error);

    return NextResponse.json(
      { error: "Une erreur est survenue lors de la connexion." },
      { status: 500 }
    );
  }
}