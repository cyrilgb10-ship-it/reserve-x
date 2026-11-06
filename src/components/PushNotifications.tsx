"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Loader2,
  Smartphone,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type PushState =
  | "loading"
  | "unsupported"
  | "disabled"
  | "enabled"
  | "denied"
  | "error";

type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  publicKey?: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (character) =>
    character.charCodeAt(0),
  );
}

async function readApiResponse(
  response: Response,
): Promise<ApiResponse> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export default function PushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Préparation du Service Worker et vérification de l'abonnement.
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!isPushSupported()) {
        if (!cancelled) {
          setState("unsupported");
        }

        return;
      }

      try {
        if (Notification.permission === "denied") {
          if (!cancelled) {
            setState("denied");
          }

          return;
        }

        const registration =
          await navigator.serviceWorker.register("/sw.js");

        await navigator.serviceWorker.ready;

        const subscription =
          await registration.pushManager.getSubscription();

        if (cancelled) return;

        if (!subscription) {
          setState("disabled");
          return;
        }

        // Synchronise l'abonnement existant avec le compte connecté.
        if (Notification.permission === "granted") {
          const response = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(subscription.toJSON()),
          });

          const data = await readApiResponse(response);

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Impossible de synchroniser cet appareil avec votre compte.",
            );
          }
        }

        if (!cancelled) {
          setState("enabled");
        }
      } catch (error) {
        console.error("Initialisation des notifications :", error);

        if (!cancelled) {
          setState("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Impossible de préparer les notifications sur cet appareil.",
          );
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  // Activation des notifications.
  async function enableNotifications() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      if (!isPushSupported()) {
        setState("unsupported");

        throw new Error(
          "Ce navigateur ne prend pas en charge les notifications push ou nécessite une connexion sécurisée.",
        );
      }

      // La permission est demandée uniquement après un clic.
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setState("denied");

        throw new Error(
          "Autorisation refusée. Modifiez les permissions de notification dans les paramètres du navigateur.",
        );
      }

      if (permission !== "granted") {
        setState("disabled");

        throw new Error(
          "Vous n'avez pas autorisé les notifications.",
        );
      }

      // Récupération de la clé publique VAPID.
      const keyResponse = await fetch("/api/push/public-key", {
        cache: "no-store",
      });

      const keyData = await readApiResponse(keyResponse);

      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(
          keyData.error ||
            "Impossible de récupérer la clé publique des notifications.",
        );
      }

      // Enregistrement du Service Worker.
      const registration =
        await navigator.serviceWorker.register("/sw.js");

      await navigator.serviceWorker.ready;

      // Vérification d'un abonnement existant.
      let subscription =
        await registration.pushManager.getSubscription();

      // Création uniquement si aucun abonnement n'existe.
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            keyData.publicKey,
          ) as BufferSource,
        });
      }

      // Enregistrement de l'abonnement dans PostgreSQL.
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible d'enregistrer cet appareil sur le serveur.",
        );
      }

      setState("enabled");
      setMessage(
        "Les notifications sont maintenant activées sur cet appareil.",
      );
    } catch (error) {
      console.error("Activation des notifications :", error);

      if (isPushSupported() && Notification.permission === "denied") {
        setState("denied");
      } else if (state !== "unsupported") {
        setState("error");
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant l'activation.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Désactivation des notifications.
  async function disableNotifications() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      if (!isPushSupported()) {
        setState("unsupported");
        return;
      }

      const registration =
        await navigator.serviceWorker.getRegistration("/");

      if (!registration) {
        setState("disabled");
        setMessage(
          "Aucun abonnement actif sur cet appareil.",
        );
        return;
      }

      const subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        setState("disabled");
        setMessage(
          "Les notifications sont déjà désactivées sur cet appareil.",
        );
        return;
      }

      const endpoint = subscription.endpoint;

      // Suppression de l'abonnement côté serveur en premier.
      const response = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de supprimer l'abonnement sur le serveur.",
        );
      }

      // Désabonnement local uniquement après confirmation serveur.
      const unsubscribed = await subscription.unsubscribe();

      if (!unsubscribed) {
        throw new Error(
          "L'abonnement serveur a été supprimé, mais le navigateur n'a pas confirmé le désabonnement.",
        );
      }

      setState("disabled");
      setMessage(
        "Les notifications ont été désactivées sur cet appareil.",
      );
    } catch (error) {
      console.error("Désactivation des notifications :", error);

      setState("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible de désactiver les notifications.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#e5edf5] bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f8fafd] text-[#533afd]">
          <Bell size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#061b31]">
            Notifications push
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Recevez des alertes importantes de Reserve X directement sur cet
            appareil, même lorsque le site n'est pas ouvert.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {state === "loading" && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Vérification de cet appareil...
          </div>
        )}

        {state === "unsupported" && (
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            <p>
              Ce navigateur ne prend pas en charge les notifications push
              ou nécessite une connexion HTTPS.
            </p>
          </div>
        )}

        {state === "denied" && (
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            <p>
              Les notifications sont bloquées dans les paramètres de votre
              navigateur. Autorisez-les pour cet appareil.
            </p>
          </div>
        )}

        {(state === "disabled" || state === "error") && (
          <button
            type="button"
            onClick={enableNotifications}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#533afd] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7389ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Bell size={16} />
            )}

            Activer les notifications
          </button>
        )}

        {state === "enabled" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={17} />

              Notifications activées sur cet appareil
            </div>

            <button
              type="button"
              onClick={disableNotifications}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md border border-[#e5edf5] px-3 py-2 text-sm text-slate-600 transition hover:bg-[#f8fafd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <BellOff size={15} />
              )}

              Désactiver
            </button>
          </div>
        )}
      </div>

      {message && (
        <p
          className="mt-3 text-xs leading-5 text-slate-500"
          role="status"
        >
          {message}
        </p>
      )}

      <div className="mt-4 flex items-start gap-2 border-t border-[#e5edf5] pt-4 text-xs leading-5 text-slate-400">
        <Smartphone size={15} className="mt-0.5 shrink-0" />

        <p>
          Le réglage concerne uniquement cet appareil. Vous pouvez activer
          les notifications sur plusieurs appareils.
        </p>
      </div>
    </section>
  );
}