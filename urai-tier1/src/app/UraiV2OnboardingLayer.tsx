"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { v2Onboarding } from "@/spatial/assets/uraiV2Assets";
import { useBrowserLocation } from "@/hooks/useBrowserLocation";
import { useSelectedMemory } from "@/spatial/memory/useSelectedMemory";
import { guidedCardHref, guidedFocusArrived, guidedFocusHref } from "./onboardingJourney";
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

function paramsForLocation(location: string) {
  const address = location.split("#")[0];
  return new URLSearchParams(address.includes("?") ? address.slice(address.indexOf("?") + 1) : "");
}

function GuidedMemoryAction() {
  const location = useBrowserLocation();
  const result = useSelectedMemory();
  const href = guidedFocusHref(paramsForLocation(location), result);
  return href
    ? <a href={href}>Open Focus</a>
    : <button type="button" disabled aria-label="Select a Memory Star before opening Focus">{result.status === "loading" ? "Opening selected star…" : "Select a Memory Star"}</button>;
}

function GuidedFocusCompletion() {
  const location = useBrowserLocation();
  const result = useSelectedMemory();
  useEffect(() => {
    if (result.status !== "ready" && result.status !== "demo") return;
    const params = paramsForLocation(location);
    if (!guidedFocusHref(params, result)) return;
    let completed = false;
    const observer = new MutationObserver(() => checkArrival());
    const checkArrival = () => {
      // A route can change before React tears down this effect. A stale result
      // must not complete a different memory's journey or a failed arrival.
      if (completed || `${window.location.pathname}${window.location.search}${window.location.hash}` !== location) return;
      const chamber = document.querySelector<HTMLElement>('[data-testid="urai-final-focus-chamber"]');
      if (!chamber || !guidedFocusArrived(params, result, chamber.dataset)) return;
      completed = true;
      rememberCompletion();
      observer.disconnect();
    };
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-memory-status", "data-chamber-state", "data-memory-id", "data-manifest-id"],
    });
    checkArrival();
    return () => observer.disconnect();
  }, [location, result]);
  return null;
}

function OnboardingCardContent() {
  const pathname = (usePathname() || "/").replace(/\/+$/, "") || "/";
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const [dismissed, setDismissed] = useState(false);
  const [automaticFirstRun, setAutomaticFirstRun] = useState(false);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const navigationKey = `${pathname}?${query}`;
  const previousNavigationKeyRef = useRef(navigationKey);
  const card = cards[pathname as keyof typeof cards];
  const explicitSequence = searchParams?.get("onboarding") === "1" || searchParams?.get("firstRun") === "1";

  useEffect(() => {
    // Do not reset dismissal from the delayed mount effect: under a busy world
    // hydration that can race a keyboard-triggered Skip and resurrect the card.
    // Reset only after a real route/query transition.
    if (previousNavigationKeyRef.current !== navigationKey) {
      previousNavigationKeyRef.current = navigationKey;
      setDismissed(false);
    }
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
  }, [explicitSequence, navigationKey, pathname]);

  const shouldShow = explicitSequence || automaticFirstRun;

  useEffect(() => {
    if (!shouldShow || !card || !explicitSequence) return;
    // Guided route handoffs can hydrate/remount the world shell after navigation.
    // Restore the explicit Skip target after two frames so keyboard users retain
    // a deterministic dismissal target on compact portrait/landscape viewports.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => dismissRef.current?.focus({ preventScroll: true }));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [card, explicitSequence, pathname, query, shouldShow]);

  if (pathname === "/focus" && explicitSequence) return <GuidedFocusCompletion />;
  if (dismissed || !shouldShow || !card) return null;

  const dismiss = () => {
    // Commit the user's dismissal before synchronous completion consumers can
    // schedule heavy world work or observe the guide as still available.
    flushSync(() => setDismissed(true));
    rememberCompletion();
  };

  const finishIfLastGuidedStep = () => {
    if (pathname === "/privacy-controls") rememberCompletion();
  };

  return (
    <aside className="uraiV2OnboardingCard" aria-label={`${card.label} first-run guide`} data-first-run={automaticFirstRun ? "automatic" : "guided"}>
      <div className="uraiV2OnboardingContent">
        <img
          src={card.asset.src}
          alt={card.asset.alt}
          onError={(event) => {
            if (event.currentTarget.dataset.fallbackApplied === "true") return;
            event.currentTarget.dataset.fallbackApplied = "true";
            event.currentTarget.src = card.asset.fallback;
          }}
        />
        <div className="uraiV2OnboardingCopy">
          <span>{card.label}</span>
          <strong>{card.title}</strong>
        </div>
      </div>
      <div className="uraiV2OnboardingActions">
        {pathname === "/life-map" ? <GuidedMemoryAction /> : "href" in card ? <a href={guidedCardHref(card.href, new URLSearchParams(query))} onClick={finishIfLastGuidedStep}>{card.action}</a> : null}
        <button ref={dismissRef} type="button" onClick={dismiss}>Skip</button>
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
