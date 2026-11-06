import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

import ReservationForm from "./ReservationForm";

export const instant = false;

type Props = {
  params: Promise<{
    serviceId: string;
  }>;
};

export default async function ReservationPage({ params }: Props) {
  // Indique à Next.js que cette page dépend de données dynamiques.
  await connection();

  const { serviceId } = await params;

  const redirectUrl = `/reservation/${encodeURIComponent(serviceId)}`;

  // La réservation nécessite obligatoirement une session client.
  const session = await getSession();

  if (!session || session.role !== "CUSTOMER") {
    redirect(
      `/client/connexion?redirect=${encodeURIComponent(redirectUrl)}`
    );
  }

  const [user, service] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        phone: true,
      },
    }),

    prisma.service.findFirst({
      where: {
        id: serviceId,
        isActive: true,
        profile: {
          isPublished: true,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        durationMinutes: true,
        capacity: true,

        profile: {
          select: {
            businessName: true,
            category: true,
            address: true,
            city: true,
            country: true,
          },
        },

        customFields: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            label: true,
            type: true,
            required: true,
            options: true,
          },
        },
      },
    }),
  ]);

  // Vérification supplémentaire du compte en base de données.
  if (!user || user.role !== "CUSTOMER") {
    redirect(
      `/client/connexion?redirect=${encodeURIComponent(redirectUrl)}`
    );
  }

  if (!service) {
    notFound();
  }

  const nameParts = user.name.trim().split(/\s+/);

  const firstName = nameParts.shift() ?? "";
  const lastName = nameParts.join(" ");

  const formattedService = {
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    currency: service.currency,
    durationMinutes: service.durationMinutes,
    capacity: service.capacity,

    category: service.profile.category,

    profile: {
      businessName: service.profile.businessName,
      address: service.profile.address,
      city: service.profile.city,
      country: service.profile.country,
    },

    customFields: service.customFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      options: Array.isArray(field.options)
        ? field.options.filter(
            (option): option is string => typeof option === "string"
          )
        : [],
    })),
  };

  return (
    <main className="min-h-screen bg-[#FFFBF5] px-4 py-8 text-zinc-900 sm:px-6 lg:py-12">
      <ReservationForm
        service={formattedService}
        customer={{
          firstName,
          lastName,
          email: user.email,
          phone: user.phone,
        }}
      />
    </main>
  );
}