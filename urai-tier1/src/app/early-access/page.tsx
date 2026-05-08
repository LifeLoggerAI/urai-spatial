"use client";

import { useEffect, useState } from "react";
import { saveEarlyAccessSignup } from "../../spatial/landing/earlyAccessSignup";
import { trackLaunchEvent } from "../../spatial/analytics/track";
import Link from "next/link";
import { TierOneStaticShell } from "@/spatial/layout/TierOneStaticShell";

export default function EarlyAccessPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    trackLaunchEvent("landing_viewed");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    trackLaunchEvent("early_access_signup_started");

    try {
      await saveEarlyAccessSignup(email);
      trackLaunchEvent("early_access_signup_completed");
      setStatus("success");
      setEmail("");
      setMessage("You are on the list. When the map opens, we will send you the first light.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Something went wrong.");
    }
  }

  return (
    <TierOneStaticShell
      eyebrow="Early Access"
      title="URAI opens quietly."
      description="A private cinematic life map for memory, focus, reflection, and replay."
    >
      <Link href="/demo/life-map" className="tier-one-route-card__button" onClick={() => trackLaunchEvent("demo_cta_clicked")}>
        Watch the Life Map demo
      </Link>

      <form onSubmit={handleSubmit} className="tier-one-form">
        <input type="email" required placeholder="your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={status === "loading"}>{status === "loading" ? "Joining..." : "Join Early Access"}</button>
      </form>

      {message ? <p className="tier-one-static-shell__message">{message}</p> : null}

      <div className="tier-one-static-shell__microcopy">
        <p>URAI does not diagnose or decide what your life means.</p>
        <p>It helps you notice patterns you may want to reflect on.</p>
      </div>
    </TierOneStaticShell>
  );
}
