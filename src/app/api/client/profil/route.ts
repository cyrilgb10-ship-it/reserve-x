import { connection, NextRequest, NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ======================================================
// GET : RÉCUPÉRER LE PROFIL
// ======================================================

export async function GET() {
  await connection();

  try {
    const session = await getSession();

    if (!session || session.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Compte introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Erreur récupération profil client :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer votre profil." },
      { status: 500 }
    );
  }
}

// ======================================================
// PATCH : MODIFIER LE PROFIL
// ======================================================

export async function PATCH(request: NextRequest) {
  await connection();

  try {
    const session = await getSession();

    if (!session || session.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "Le nom doit contenir entre 2 et 80 caractères." },
        { status: 400 }
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Veuillez saisir une adresse e-mail valide." },
        { status: 400 }
      );
    }

    if (
      phone.length < 8 ||
      phone.length > 20 ||
      !/^[+0-9\s().-]+$/.test(phone)
    ) {
      return NextResponse.json(
        { error: "Veuillez saisir un numéro de téléphone valide." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: {
          not: session.userId,
        },
        OR: [
          { email },
          { phone },
        ],
      },
      select: {
        email: true,
        phone: true,
      },
    });

    if (existingUser?.email === email) {
      return NextResponse.json(
        { error: "Cette adresse e-mail est déjà utilisée." },
        { status: 409 }
      );
    }

    if (existingUser?.phone === phone) {
      return NextResponse.json(
        { error: "Ce numéro de téléphone est déjà utilisé." },
        { status: 409 }
      );
    }

    const user = await prisma.user.update({
      where: {
        id: session.userId,
      },
      data: {
        name,
        email,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "Votre profil a été mis à jour.",
      user,
    });
  } catch (error) {
    console.error("Erreur modification profil client :", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Cette adresse e-mail ou ce numéro de téléphone est déjà utilisé.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Impossible de modifier votre profil." },
      { status: 500 }
    );
  }
}