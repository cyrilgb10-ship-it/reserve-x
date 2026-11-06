import { connection, NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import {
  WithdrawalStatus,
  WalletTransactionType,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const withdrawalSchema = z.object({
  amount: z.coerce.number().int().min(1).max(100_000_000),

  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),

  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s().-]{6,25}$/, "Numéro de téléphone invalide."),

  operator: z.string().trim().min(2).max(50),
});

async function getProfessionalProfile(userId: string) {
  return prisma.professionalProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      businessName: true,
    },
  });
}

// ======================================================
// GET : RÉCUPÉRER LE PORTEFEUILLE
// ======================================================

export async function GET() {
  await connection();

  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès réservé aux professionnels." },
        { status: 401 },
      );
    }

    const profile = await getProfessionalProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Profil professionnel introuvable." },
        { status: 404 },
      );
    }

    // Garantir l'existence du portefeuille.
    const wallet = await prisma.wallet.upsert({
      where: {
        profileId: profile.id,
      },
      create: {
        profileId: profile.id,
      },
      update: {},
      select: {
        id: true,
        availableBalance: true,
        pendingBalance: true,
        totalEarned: true,
        totalWithdrawn: true,
        updatedAt: true,

        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 30,
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            reference: true,
            createdAt: true,

            booking: {
              select: {
                reference: true,
                service: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },

        withdrawals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            reference: true,
            amount: true,
            firstName: true,
            lastName: true,
            phone: true,
            operator: true,
            status: true,
            adminNote: true,
            processedAt: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        businessName: profile.businessName,
      },
      wallet,
    });
  } catch (error) {
    console.error("GET /api/pro/portefeuille :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer votre portefeuille." },
      { status: 500 },
    );
  }
}

// ======================================================
// POST : DEMANDER UN RETRAIT
// ======================================================

export async function POST(request: NextRequest) {
  await connection();

  try {
    const session = await getSession();

    if (!session || session.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Accès réservé aux professionnels." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const validation = withdrawalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Informations de retrait invalides.",
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    const profile = await getProfessionalProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Profil professionnel introuvable." },
        { status: 404 },
      );
    }

    const withdrawalReference =
      `RX-WD-${randomBytes(5).toString("hex").toUpperCase()}`;

    const withdrawal = await prisma.$transaction(async (tx) => {
      // Garantir l'existence du portefeuille.
      const wallet = await tx.wallet.upsert({
        where: {
          profileId: profile.id,
        },
        create: {
          profileId: profile.id,
        },
        update: {},
        select: {
          id: true,
        },
      });

      // Débiter le solde disponible de façon atomique.
      // Deux demandes simultanées ne peuvent pas dépenser
      // le même solde.
      const debit = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          availableBalance: {
            gte: data.amount,
          },
        },
        data: {
          availableBalance: {
            decrement: data.amount,
          },
        },
      });

      if (debit.count !== 1) {
        throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
      }

      // Créer la demande de retrait.
      const createdWithdrawal = await tx.withdrawal.create({
        data: {
          walletId: wallet.id,
          reference: withdrawalReference,
          amount: data.amount,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          operator: data.operator,
          status: WithdrawalStatus.PENDING,
        },
        select: {
          id: true,
          reference: true,
          amount: true,
          firstName: true,
          lastName: true,
          phone: true,
          operator: true,
          status: true,
          createdAt: true,
        },
      });

      // Enregistrer le mouvement financier.
      // Le montant est positif dans le ledger ; l'interface
      // l'affichera comme une sortie puisqu'il s'agit d'un retrait.
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.WITHDRAWAL,
          amount: data.amount,
          description: `Demande de retrait ${withdrawalReference}`,
          reference: `WITHDRAWAL_${createdWithdrawal.id}`,
        },
      });

      return createdWithdrawal;
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Votre demande de retrait a été enregistrée. Elle sera traitée par l'administration.",
        withdrawal,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_AVAILABLE_BALANCE"
    ) {
      return NextResponse.json(
        {
          error: "Votre solde disponible est insuffisant.",
        },
        { status: 409 },
      );
    }

    console.error("POST /api/pro/portefeuille :", error);

    return NextResponse.json(
      {
        error: "Impossible d'enregistrer votre demande de retrait.",
      },
      { status: 500 },
    );
  }
}