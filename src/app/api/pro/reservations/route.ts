import { connection, NextRequest, NextResponse } from "next/server";
import {
  BookingStatus,
  UserRole,
} from "@/generated/prisma/client";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedStatuses = Object.values(BookingStatus);

export async function GET(request: NextRequest) {
  await connection();

  try {
    const session = await getSession();

    if (!session || session.role !== UserRole.PROFESSIONAL) {
      return NextResponse.json(
        { error: "Accès non autorisé." },
        { status: 401 },
      );
    }

    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profil professionnel introuvable." },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const search = searchParams.get("search")?.trim() || "";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "20", 10) || 20,
      ),
    );

    if (
      statusParam &&
      statusParam !== "ALL" &&
      !allowedStatuses.includes(statusParam as BookingStatus)
    ) {
      return NextResponse.json(
        { error: "Statut de réservation invalide." },
        { status: 400 },
      );
    }

    const where = {
      profileId: profile.id,

      ...(statusParam && statusParam !== "ALL"
        ? { status: statusParam as BookingStatus }
        : {}),

      ...(search
        ? {
            OR: [
              {
                reference: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                customerFirstName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                customerLastName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                customerPhone: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                customerEmail: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                service: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const profileFilter = { profileId: profile.id };

    const [
      bookings,
      total,
      all,
      pendingPayment,
      confirmed,
      completed,
      cancelled,
      expired,
      refunded,
    ] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          reference: true,
          customerFirstName: true,
          customerLastName: true,
          customerPhone: true,
          customerEmail: true,
          startsAt: true,
          endsAt: true,
          quantity: true,
          amount: true,
          currency: true,
          status: true,
          paymentAttempt: true,
          qrUsedAt: true,
          completedAt: true,
          createdAt: true,

          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
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
              network: true,
              paidAt: true,
              verifiedAt: true,
            },
          },
        },
      }),

      prisma.booking.count({ where }),

      prisma.booking.count({
        where: profileFilter,
      }),

      prisma.booking.count({
        where: {
          ...profileFilter,
          status: BookingStatus.PENDING_PAYMENT,
        },
      }),

      prisma.booking.count({
        where: {
          ...profileFilter,
          status: BookingStatus.CONFIRMED,
        },
      }),

      prisma.booking.count({
        where: {
          ...profileFilter,
          status: BookingStatus.COMPLETED,
        },
      }),

      prisma.booking.count({
        where: {
          ...profileFilter,
          status: BookingStatus.CANCELLED,
        },
      }),

      prisma.booking.count({
        where: {
          ...profileFilter,
          status: BookingStatus.EXPIRED,
        },
      }),

      prisma.booking.count({
        where: {
          ...profileFilter,
          status: BookingStatus.REFUNDED,
        },
      }),
    ]);

    // Conserver la structure payment attendue par l'interface.
    const formattedBookings = bookings.map((booking) => {
      const {
        payments,
        paymentAttempt,
        ...bookingData
      } = booking;

      const latestPayment = payments[0];

      const currentPayment =
        latestPayment?.attemptNumber === paymentAttempt
          ? latestPayment
          : null;

      return {
        ...bookingData,
        payment: currentPayment
          ? {
              amount: currentPayment.amount,
              currency: currentPayment.currency,
              status: currentPayment.status,
              network: currentPayment.network,
              paidAt: currentPayment.paidAt,
              verifiedAt: currentPayment.verifiedAt,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,

      bookings: formattedBookings,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      counts: {
        all,
        pendingPayment,
        confirmed,
        completed,
        cancelled,
        expired,
        refunded,
      },
    });
  } catch (error) {
    console.error("GET /api/pro/reservations:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les réservations." },
      { status: 500 },
    );
  }
}