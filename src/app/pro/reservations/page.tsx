import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import ReservationsManager from "./ReservationsManager";

export const instant = false;

export default async function ReservationsPage() {
  const session = await getSession();

  if (!session || session.role !== "PROFESSIONAL") {
    redirect("/pro/connexion");
  }

  return <ReservationsManager />;
}