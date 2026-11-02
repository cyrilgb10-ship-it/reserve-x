import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import PrestationsManager from "./PrestationsManager";

export const instant = false;

export default async function PrestationsPage() {
const session = await getSession();

if (!session || session.role !== "PROFESSIONAL") {
redirect("/pro/connexion");
}

return <PrestationsManager />;
}
