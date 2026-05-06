"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TierOneStaticShell } from "@/spatial/layout/TierOneStaticShell";
import { acceptInvite } from "../../../spatial/landing/inviteAccess";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code ?? "";

  const [status, setStatus] = useState<"loading" | "accepted" | "missing" | "invalid" | "offline">("loading");
  const [message, setMessage] = useState("Checking your invite...");

  useEffect(() => {
    async function run() {
      const result = await acceptInvite(code);

      if (result.ok) {
        setStatus("accepted");
        setMessage("Invite accepted. Preparing your Life Map...");

        setTimeout(() => {
          router.push("/life-map");
        }, 1500);

        return;
      }

      setStatus(result.status);
      setMessage(
        result.status === "missing"
          ? "Invite not found."
          : result.status === "offline"
            ? "We could not reach the invite server. Your code was preserved locally — try again when the connection returns."
            : "Invite invalid.",
      );
    }

    run();
  }, [code, router]);

  return (
    <TierOneStaticShell
      eyebrow="URAI Invite"
      title={status === "accepted" ? "The map is opening." : "Access check"}
      description="Your private spatial layer is being prepared for the Tier-1 launch experience."
    >
      <p className={status === "accepted" ? "tier-one-static-shell__message" : "tier-one-static-shell__microcopy"}>
        {message}
      </p>

      {status !== "accepted" ? (
        <button type="button" className="tier-one-route-card__button" onClick={() => router.push("/early-access")}>
          {status === "offline" ? "Join Early Access" : "Request Access"}
        </button>
      ) : null}
    </TierOneStaticShell>
  );
}
