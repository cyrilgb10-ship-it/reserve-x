"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";

export default function PublishProfileButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function publishProfile() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pro/profil/publication", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Impossible de publier votre établissement.");
        return;
      }

      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={publishProfile}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#533afd] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4229e8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <Globe size={17} />
        )}

        {loading ? "Publication..." : "Publier mon établissement"}
      </button>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}