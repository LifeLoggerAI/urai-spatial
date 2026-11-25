"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TierOneStaticShell } from "@/spatial/layout/TierOneStaticShell";
import { acceptInvite } from "../../../spatial/landing/inviteAccess";

type InvitePageClientProps = {
  code: string;
};

export function InvitePageClient({ code }: InvitePageClientProps) {
  const router = useRouter();

  const [status, setStatus] = useState<"ready" | "loading" | "accepted" | "missing" | "invalid" | "offline">("ready");
  const action = useRef<"idle" | "pending" | "accepted">("idle");
  const generation = useRef(0);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    generation.current += 1;
    action.current = "idle";
    setStatus("ready");
    return () => {
      generation.current += 1;
      if (navigationTimer.current !== null) clearTimeout(navigationTimer.current);
    };
  }, [code]);

  async function handleAccept() {
    if (action.current !== "idle") return;
    action.current = "pending";
    const activeGeneration = generation.current;
    setStatus("loading");

    try {
      const result = await acceptInvite(code);
      if (generation.current !== activeGeneration) return;

      if (result.ok) {
        action.current = "accepted";
        setStatus("accepted");
        navigationTimer.current = setTimeout(() => {
          if (generation.current === activeGeneration) router.push("/life-map");
        }, 1500);
        return;
      }

      setStatus(result.status === "accepted" ? "invalid" : result.status);
    } catch {
      if (generation.current === activeGeneration) setStatus("offline");
    } finally {
      if (generation.current === activeGeneration && action.current === "pending") action.current = "idle";
    }
  }

  const message = status === "ready"
    ? "Accept this invitation to continue to your Life Map."
    : status === "loading"
      ? "Confirming your invitation…"
      : status === "accepted"
        ? "Invitation accepted. Opening your Life Map…"
        : status === "missing"
          ? "This invitation could not be found. Check the code or request access."
          : status === "offline"
            ? "The invitation service could not confirm this code. Try again when the connection returns."
            : "This invitation is not valid. Check the code or request access.";

  return (
    <TierOneStaticShell
      eyebrow="URAI Invite"
      title={status === "accepted" ? "Invitation accepted." : "Your invitation."}
      description="Review this code and choose whether to accept it."
    >
      <p className="tier-one-static-shell__microcopy">Invitation code: <code>{code}</code></p>
      <p role="status" aria-live="polite" className={status === "accepted" ? "tier-one-static-shell__message" : "tier-one-static-shell__microcopy"}>
        {message}
      </p>

      <button type="button" className="tier-one-route-card__button" disabled={status === "loading" || status === "accepted"} aria-busy={status === "loading"} onClick={handleAccept}>
        {status === "loading" ? "Accepting…" : status === "accepted" ? "Accepted" : "Accept invite"}
      </button>

      {status !== "accepted" ? (
        <button type="button" className="tier-one-route-card__button" onClick={() => router.push("/early-access")}>
          Request Access
        </button>
      ) : null}
    </TierOneStaticShell>
  );
}
