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

const ONBOARDING_COMPLETION_KEY = "urai:onboarding:v2:complete";

const homeCard = {
  asset: v2Onboarding["first-run-home-card"],
  label: "HOME THRESHOLD",
  title: "Ground below. Life Map above.",
  href: "/ground?onboarding=1",
  action: "Enter Ground",
} as const;

const cards = {
  "/": homeCard,
  "/home": homeCard,
  "/ground": {
    asset: v2Onboarding["first-run-ground-card"],
    label: "PRIVATE FLOOR",
    title: "Inspect first. Approve second.",
    href: "/life-map?onboarding=1",
    action: "Ascend to Life Map",
  },
  "/life-map": {
    asset: v2Onboarding["first-run-life-map-card"],
    label: "MEMORY FIELD",
    title: "Select a star. Enter its Focus.",
    href: "/focus?memoryId=quiet-reset&onboarding=1",
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

function rememberCompletion() {
  try {
    window.localStorage.setItem(ONBOARDING_COMPLETION_KEY, "1");
  } catch {
    // Storage is optional. The experience remains dismissible for this render.
  }
}

function OnboardingCardContent() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const [dismissed, setDismissed] = useState(false);
  const [automaticFirstRun, setAutomaticFirstRun] = useState(false);
  const card = cards[pathname as keyof typeof cards];
  const explicitSequence = searchParams?.get("onboarding") === "1" || searchParams?.get("firstRun") === "1";

  useEffect(() => {
    setDismissed(false);
    if (explicitSequence) {
      setAutomaticFirstRun(false);
      return;
    }
    if (pathname !== "/" && pathname !== "/home") {
      setAutomaticFirstRun(false);
      return;
    }
    try {
      setAutomaticFirstRun(window.localStorage.getItem(ONBOARDING_COMPLETION_KEY) !== "1");
    } catch {
      setAutomaticFirstRun(true);
    }
  }, [explicitSequence, pathname, query]);

  const shouldShow = explicitSequence || automaticFirstRun;
  if (dismissed || !shouldShow || !card) return null;

  const dismiss = () => {
    rememberCompletion();
    setDismissed(true);
  };

  const finishIfLastGuidedStep = () => {
    if (pathname === "/life-map" || pathname === "/privacy-controls") rememberCompletion();
  };

  return (
    <aside className="uraiV2OnboardingCard" aria-label={`${card.label} first-run guide`} data-first-run={automaticFirstRun ? "automatic" : "guided"} data-route={pathname}>
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
        <a href={card.href} onClick={finishIfLastGuidedStep}>{card.action}</a>
        <button type="button" onClick={dismiss}>Skip</button>
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
