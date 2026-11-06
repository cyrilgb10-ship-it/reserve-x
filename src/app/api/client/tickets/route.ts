import { connection, NextResponse } from "next/server";

import {
  BookingStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  await connection();

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Vous devez être connecté pour consulter vos tickets.",
        },
        { status: 401 },
      );
    }

    if (session.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          error: "Accès réservé aux clients.",
        },
        { status: 403 },
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        customerId: session.userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        reference: true,
        startsAt: true,
        endsAt: true,
        quantity: true,
        amount: true,
        currency: true,
        status: true,
        paymentAttempt: true,
        qrToken: true,
        qrUsedAt: true,
        completedAt: true,
        createdAt: true,

        service: {
          select: {
            name: true,
          },
        },

        profile: {
          select: {
            businessName: true,
            city: true,
            address: true,
          },
        },

        payments: {
          orderBy: {
            attemptNumber: "desc",
          },

          take: 1,

          select: {
            attemptNumber: true,
            amount: true,
            currency: true,
            status: true,
            paidAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    const tickets = bookings.map((booking) => {
      const {
        qrToken,
        qrUsedAt,
        paymentAttempt,
        payments,
        ...bookingData
      } = booking;

      // Dernière tentative de paiement enregistrée.
      const latestPayment = payments[0] ?? null;

      // Vérifier que le paiement correspond bien
      // au numéro de tentative actuellement attendu.
      const currentPayment =
        latestPayment?.attemptNumber === paymentAttempt
          ? latestPayment
          : null;

      // Le paiement doit être confirmé.
      const paymentIsSuccessful =
        currentPayment?.status === PaymentStatus.SUCCESS;

      // Seules les réservations confirmées ou terminées
      // peuvent disposer d'un QR code.
      const bookingAllowsQr =
        booking.status === BookingStatus.CONFIRMED ||
        booking.status === BookingStatus.COMPLETED;

      const canDisplayQr =
        paymentIsSuccessful &&
        bookingAllowsQr &&
        Boolean(qrToken);

      return {
        ...bookingData,

        // Informations du dernier paiement uniquement.
        payment: currentPayment
          ? {
              amount: currentPayment.amount,
              currency: currentPayment.currency,
              status: currentPayment.status,
              paidAt: currentPayment.paidAt,
              verifiedAt: currentPayment.verifiedAt,
            }
          : null,

        // QR code accessible uniquement si toutes
        // les conditions de sécurité sont respectées.
        qrCode: canDisplayQr ? qrToken : null,

        // Indique si le QR code a déjà été utilisé.
        qrAlreadyUsed: Boolean(qrUsedAt),
      };
    });

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length,
    });
  } catch (error) {
    console.error("GET /api/client/tickets :", error);

    return NextResponse.json(
      {
        error: "Impossible de récupérer vos tickets.",
      },
      { status: 500 },
    );
  }
}