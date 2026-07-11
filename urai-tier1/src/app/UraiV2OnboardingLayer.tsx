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
    disclosure: "Sample route guidance only. No account, world, or completion record is created.",
    href: "/ground",
    action: "Preview Ground",
  },
  "/ground": {
    asset: v2Onboarding["first-run-ground-card"],
    label: "PRIVATE FLOOR",
    title: "Inspect first. Approve second.",
    disclosure: "Sample route guidance only. No task, permission, or real-world action is approved.",
    href: "/life-map",
    action: "Preview Life Map",
  },
  "/life-map": {
    asset: v2Onboarding["first-run-life-map-card"],
    label: "MEMORY FIELD",
    title: "Select a sample star. Preview its Focus.",
    disclosure: "Sample content only. This guide does not store, import, or create a personal memory.",
    href: "/focus?memoryId=quiet-reset",
    action: "Preview Focus",
  },
  "/privacy-controls": {
    asset: v2Onboarding["first-run-privacy-card"],
    label: "CONSENT PREVIEW",
    title: "Review planned controls. Nothing changes here.",
    disclosure: "Preview only. No consent, privacy preference, export, deletion, or model permission is changed.",
    href: "/status",
    action: "View production Status",
  },
} as const;

type GuideTrigger = "onboarding=1" | "firstRun=1";

const appendGuideTrigger = (href: string, trigger: GuideTrigger) =>
  `${href}${href.includes("?") ? "&" : "?"}${trigger}`;

function GuidedDemoCardContent() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const card = cards[pathname as keyof typeof cards];
  const guideTrigger: GuideTrigger | null =
    searchParams?.get("onboarding") === "1"
      ? "onboarding=1"
      : searchParams?.get("firstRun") === "1"
        ? "firstRun=1"
        : null;
  const shouldShowGuide = guideTrigger !== null;
  const guideHref = card && guideTrigger ? appendGuideTrigger(card.href, guideTrigger) : card?.href ?? "/home";

  useEffect(() => {
    setDismissed(false);
  }, [pathname, shouldShowGuide]);

  if (dismissed || !shouldShowGuide || !card) return null;

  return (
    <aside
      className="uraiV2OnboardingCard"
      aria-label={`${card.label} optional guided demo`}
      data-guide-state="optional-guided-demo"
      data-guide-trigger="query-only"
      data-guide-persistence="none"
    >
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
        <span>{card.label} · OPTIONAL GUIDED DEMO</span>
        <strong>{card.title}</strong>
        <p>{card.disclosure}</p>
        <p>This demo does not create an account, capture consent, activate providers, or save completion.</p>
        <a href={guideHref}>{card.action}</a>
        <button type="button" onClick={() => setDismissed(true)}>Close demo</button>
      </div>
    </aside>
  );
}

export default function UraiV2OnboardingLayer() {
  return (
    <>
      <UraiCanonicalVersionAssetTemplate />
      <Suspense fallback={null}>
        <GuidedDemoCardContent />
      </Suspense>
    </>
  );
}
