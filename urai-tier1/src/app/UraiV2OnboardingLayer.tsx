"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { v2Onboarding } from "@/spatial/assets/uraiV2Assets";
import {
  inferMemoryKind,
  resolveConsentState,
  resolveMemoryState,
  type ConsentState,
} from "@/spatial/v2/livingStateResolver";
import "./v2-ground-states.css";
import "./v2-ground-council.css";
import "./v2-ground-objects.css";
import "./v2-memory-states.css";
import "./v2-realm-states.css";
import "./v2-accessibility-states.css";
import "./v2-onboarding.css";

const cards = {
  "/home": { asset: v2Onboarding["first-run-home-card"], label: "HOME THRESHOLD", title: "Ground below. Life Map above.", href: "/ground", action: "Enter Ground" },
  "/ground": { asset: v2Onboarding["first-run-ground-card"], label: "PRIVATE FLOOR", title: "Inspect first. Approve second.", href: "/life-map", action: "Ascend to Life Map" },
  "/life-map": { asset: v2Onboarding["first-run-life-map-card"], label: "MEMORY FIELD", title: "Select a star. Enter its Focus.", href: "/focus?memoryId=quiet-reset", action: "Open Focus" },
  "/privacy-controls": { asset: v2Onboarding["first-run-privacy-card"], label: "CONSENT LAYER", title: "Permissions remain visible and reversible.", href: "/passport", action: "Open Passport" },
} as const;

const consentValues = new Set<ConsentState>([
  "private", "requested", "granted", "revoked", "export-ready", "delete-ready", "provenance-visible", "shared-expired",
]);

export default function UraiV2OnboardingLayer() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const card = cards[pathname as keyof typeof cards];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind = inferMemoryKind(params.get("memoryId"));
    const memory = resolveMemoryState(kind);
    const rawConsent = params.get("consent") as ConsentState | null;
    const consent = rawConsent && consentValues.has(rawConsent) ? rawConsent : "private";
    const passport = resolveConsentState(consent);
    const body = document.body;

    body.dataset.v2MemoryKind = kind;
    body.dataset.v2ConsentState = consent;
    body.style.setProperty("--v2-star-state", `url("${memory.star.src}")`);
    body.style.setProperty("--v2-focus-state", `url("${memory.focus.src}")`);
    body.style.setProperty("--v2-replay-state", `url("${memory.replay.src}")`);
    body.style.setProperty("--v2-mirror-state", `url("${memory.mirror.src}")`);
    body.style.setProperty("--v2-passport-state", `url("${passport.src}")`);
    setOpen(params.get("onboarding") === "1" || params.get("firstRun") === "1");
  }, [pathname]);

  if (!open || !card) return null;

  return (
    <aside className="uraiV2OnboardingCard" aria-label={`${card.label} first-run guide`}>
      <img
        src={card.asset.src}
        alt=""
        onError={(event) => {
          if (event.currentTarget.dataset.fallbackApplied === "true") return;
          event.currentTarget.dataset.fallbackApplied = "true";
          event.currentTarget.src = card.asset.fallback;
        }}
      />
      <div>
        <span>{card.label}</span>
        <strong>{card.title}</strong>
        <a href={card.href}>{card.action}</a>
        <button type="button" onClick={() => setOpen(false)}>Skip</button>
      </div>
    </aside>
  );
}
