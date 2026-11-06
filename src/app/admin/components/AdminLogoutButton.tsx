"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/deconnexion", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Déconnexion impossible.");
      }

      router.replace("/admin/connexion");
      router.refresh();
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="mt-4 flex w-full items-center gap-3 border-t border-[#e5edf5] pt-4 text-sm font-medium text-slate-500 transition hover:text-red-600 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}

      {loading ? "Déconnexion..." : "Déconnexion"}
    </button>
  );
}