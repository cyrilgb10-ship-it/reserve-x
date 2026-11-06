"use server";

import { destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function logoutClient() {
  await destroySession();
  redirect("/client/connexion");
}