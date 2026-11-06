import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Session administrateur invalide." },
        { status: 401 }
      );
    }

    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Déconnexion réussie.",
    });
  } catch (error) {
    console.error("Erreur déconnexion administrateur :", error);

    return NextResponse.json(
      { error: "Impossible de terminer la déconnexion." },
      { status: 500 }
    );
  }
}