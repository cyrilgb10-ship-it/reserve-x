import {
  Prisma,
  WalletTransactionType,
} from "@/generated/prisma/client";

/**
 * Créditer une réservation payée dans le solde en attente.
 *
 * Cette fonction doit être appelée depuis une transaction Prisma.
 *
 * La référence unique BOOKING_REVENUE_<bookingId>
 * empêche de créditer deux fois la même réservation.
 */
export async function creditBookingToPendingBalance(
  tx: Prisma.TransactionClient,
  booking: {
    id: string;
    profileId: string;
    amount: number;
    currency: string;
  }
) {
  if (
    !Number.isSafeInteger(booking.amount) ||
    booking.amount <= 0
  ) {
    throw new Error("MONTANT_RESERVATION_INVALIDE");
  }

  // Garantir l'existence du portefeuille.
  const wallet = await tx.wallet.upsert({
    where: {
      profileId: booking.profileId,
    },
    create: {
      profileId: booking.profileId,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
    },
    update: {},
    select: {
      id: true,
    },
  });

  // Enregistrer le mouvement une seule fois.
  const transaction = await tx.walletTransaction.createMany({
    data: [
      {
        walletId: wallet.id,
        bookingId: booking.id,
        type: WalletTransactionType.BOOKING_REVENUE,
        amount: booking.amount,
        description: `Paiement reçu - prestation en attente (${booking.currency})`,
        reference: `BOOKING_REVENUE_${booking.id}`,
      },
    ],
    skipDuplicates: true,
  });

  // Modifier les soldes uniquement si le mouvement
  // vient réellement d'être créé.
  if (transaction.count === 1) {
    await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        pendingBalance: {
          increment: booking.amount,
        },
        totalEarned: {
          increment: booking.amount,
        },
      },
    });

    return {
      credited: true,
      amount: booking.amount,
      walletId: wallet.id,
    };
  }

  return {
    credited: false,
    amount: booking.amount,
    walletId: wallet.id,
  };
}