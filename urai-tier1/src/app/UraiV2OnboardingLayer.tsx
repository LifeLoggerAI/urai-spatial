"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { v2Onboarding } from "@/spatial/assets/uraiV2Assets";
import UraiCanonicalVersionAssetTemplate from "./UraiCanonicalVersionAssetTemplate";
import "./v2-ground-states.css";
import "./v2-ground-council.css";
import "./v2-ground-objects.css";
import "./v2-ground-interaction.css";
import "./v2-memory-states.css";
import "./v2-realm-states.css";
import "./v2-accessibility-states.css";
import "./v2-state-controller.css";
import "./v2-onboarding.css";

const cards = {
  "/home": {
    asset: v2Onboarding["first-run-home-card"],
    label: "HOME THRESHOLD",
    title: "Ground below. Life Map above.",
    href: "/ground",
    action: "Enter Ground",
  },
  "/ground": {
    asset: v2Onboarding["first-run-ground-card"],
    label: "PRIVATE FLOOR",
    title: "Inspect first. Approve second.",
    href: "/life-map",
    action: "Ascend to Life Map",
  },
  "/life-map": {
    asset: v2Onboarding["first-run-life-map-card"],
    label: "MEMORY FIELD",
    title: "Select a star. Enter its Focus.",
    href: "/focus?memoryId=quiet-reset",
    action: "Open Focus",
  },
  "/privacy-controls": {
    asset: v2Onboarding["first-run-privacy-card"],
    label: "CONSENT LAYER",
    title: "Permissions remain visible and reversible.",
    href: "/passport",
    action: "Open Passport",
  },
} as const;

function OnboardingCardContent() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const [dismissed, setDismissed] = useState(false);
  const card = cards[pathname as keyof typeof cards];
  const shouldShow =
    searchParams?.get("onboarding") === "1" ||
    searchParams?.get("firstRun") === "1";

  useEffect(() => {
    setDismissed(false);
  }, [pathname, query]);

  if (dismissed || !shouldShow || !card) return null;

  return (
    <aside className="uraiV2OnboardingCard" aria-label={`${card.label} first-run guide`}>
      <img
        src={card.asset.src}
        alt={card.asset.alt}
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
        <button type="button" onClick={() => setDismissed(true)}>Skip</button>
      </div>
    </aside>
  );
}

export default function UraiV2OnboardingLayer() {
  return (
    <>
      <UraiCanonicalVersionAssetTemplate />
      <Suspense fallback={null}>
        <OnboardingCardContent />
      </Suspense>
    </>
  );
}
