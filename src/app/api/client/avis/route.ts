import { connection, NextRequest, NextResponse } from "next/server";

import {
  BookingStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ======================================================
// GET : RÉCUPÉRER LES RÉSERVATIONS ET LES AVIS DU CLIENT
// ======================================================

export async function GET() {
  await connection();

  try {
    const session = await getSession();

    if (!session || session.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 },
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        customerId: session.userId,
        status: BookingStatus.COMPLETED,
      },
      orderBy: {
        completedAt: "desc",
      },
      include: {
        payments: {
          orderBy: {
            attemptNumber: "desc",
          },
          take: 1,
          select: {
            attemptNumber: true,
            status: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        profile: {
          select: {
            businessName: true,
            city: true,
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    const eligibleBookings = bookings.filter((booking) => {
      const latestPayment = booking.payments[0];

      return (
        latestPayment?.attemptNumber === booking.paymentAttempt &&
        latestPayment.status === PaymentStatus.SUCCESS
      );
    });

    return NextResponse.json({
      bookings: eligibleBookings.map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        completedAt: booking.completedAt,
        amount: booking.amount,
        currency: booking.currency,
        service: booking.service.name,
        businessName: booking.profile.businessName,
        city: booking.profile.city,
        review: booking.review,
      })),
    });
  } catch (error) {
    console.error("Erreur récupération avis client :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer vos avis." },
      { status: 500 },
    );
  }
}

// ======================================================
// POST : ENREGISTRER UN AVIS
// ======================================================

export async function POST(request: NextRequest) {
  await connection();

  try {
    const session = await getSession();

    if (!session || session.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 },
      );
    }

    const body = await request.json();

    const bookingId =
      typeof body.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    const rating = Number(body.rating);

    const comment =
      typeof body.comment === "string"
        ? body.comment.trim()
        : "";

    if (!bookingId) {
      return NextResponse.json(
        { error: "Réservation invalide." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "La note doit être comprise entre 1 et 5." },
        { status: 400 },
      );
    }

    if (comment.length > 1000) {
      return NextResponse.json(
        { error: "Le commentaire ne peut pas dépasser 1000 caractères." },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: session.userId,
      },
      include: {
        payments: {
          orderBy: {
            attemptNumber: "desc",
          },
          take: 1,
          select: {
            attemptNumber: true,
            status: true,
          },
        },
        review: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Réservation introuvable." },
        { status: 404 },
      );
    }

    const latestPayment = booking.payments[0];

    const hasValidPayment =
      latestPayment?.attemptNumber === booking.paymentAttempt &&
      latestPayment.status === PaymentStatus.SUCCESS;

    if (
      booking.status !== BookingStatus.COMPLETED ||
      !hasValidPayment
    ) {
      return NextResponse.json(
        {
          error:
            "Vous pourrez donner votre avis uniquement après la réalisation de la prestation.",
        },
        { status: 403 },
      );
    }

    if (booking.review) {
      return NextResponse.json(
        { error: "Vous avez déjà donné votre avis pour cette réservation." },
        { status: 409 },
      );
    }

    const review = await prisma.review.create({
      data: {
        profileId: booking.profileId,
        bookingId: booking.id,
        rating,
        comment: comment || null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "Votre avis a été enregistré.",
      review,
    });
  } catch (error) {
    console.error("Erreur création avis :", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Vous avez déjà donné votre avis pour cette réservation." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Impossible d'enregistrer votre avis." },
      { status: 500 },
    );
  }
}