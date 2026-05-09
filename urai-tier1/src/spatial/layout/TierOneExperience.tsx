"use client";

import React, { Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import HomeScene from "@/scene/HomeScene";
import MirrorRouteLayer from "@/scene/MirrorRouteLayer";
import { SpatialShell } from "./SpatialShell";

export type TierOneExperienceMode = "home" | "ascent" | "life-map" | "demo" | "replay" | "focus" | "unwind" | "mirror";

type Props = {
  mode: TierOneExperienceMode;
  title?: string;
  eyebrow?: string;
  description?: string;
  cta?: React.ReactNode;
};

const fallbackCopy: Record<TierOneExperienceMode, { eyebrow: string; title: string; description: string }> = {
  home: {
    eyebrow: "URAI Spatial",
    title: "Review your remembered moments in a spatial map.",
    description: "Open a private memory space, choose a remembered moment, replay its emotional pattern, and review the reflection summary.",
  },
  ascent: {
    eyebrow: "Opening Life Map",
    title: "Preparing your memory map.",
    description: "URAI is moving from the home view into the constellation of remembered moments.",
  },
  "life-map": {
    eyebrow: "Life Map",
    title: "Your memory map",
    description: "Select a memory to review its replay, emotional pattern, and reflection summary.",
  },
  demo: {
    eyebrow: "Preview Map",
    title: "Preview remembered moments without private data.",
    description: "Explore the memory map, focus view, and replay flow with local sample moments.",
  },
  replay: {
    eyebrow: "Memory Replay",
    title: "Watch the memory pattern replay.",
    description: "Replay reconstructs this moment as a short guided sequence with progress, controls, and a clear exit path.",
  },
  focus: {
    eyebrow: "Memory Focus",
    title: "Review this selected memory.",
    description: "Check the memory context, readiness, privacy state, and replay action before starting.",
  },
  unwind: {
    eyebrow: "Unwind",
    title: "Return to a safe spatial state.",
    description: "Pause the replay layer, settle the scene, and choose whether to revisit the Life Map or return home.",
  },
  mirror: {
    eyebrow: "Reflection Summary",
    title: "This memory shows a calm recovery pattern.",
    description: "Review the concrete pattern summary, privacy status, and recommended next memory.",
  },
};

function shellModeFor(mode: TierOneExperienceMode) {
  if (mode === "replay") return "replay" as const;
  if (mode === "focus" || mode === "mirror" || mode === "unwind") return "detail" as const;
  if (mode === "ascent" || mode === "life-map") return "sky" as const;
  return "overview" as const;
}

export function TierOneExperience({ mode, title, eyebrow, description, cta }: Props) {
  const copy = fallbackCopy[mode];
  const router = useRouter();
  const openLifeMap = useCallback(() => router.push("/life-map", { scroll: false }), [router]);
  const openHome = useCallback(() => router.push("/", { scroll: false }), [router]);
  const showRouteCard = mode !== "home" && mode !== "life-map";

  return (
    <SpatialShell mode={shellModeFor(mode)}>
      <Suspense fallback={null}>
        <HomeScene sceneMode={mode} />
        {mode === "mirror" ? <MirrorRouteLayer onLifeMap={openLifeMap} onHome={openHome} /> : null}
      </Suspense>

      {showRouteCard ? (
        <aside className="tier-one-route-card" data-route-mode={mode}>
          <div className="tier-one-route-card__eyebrow">{eyebrow ?? copy.eyebrow}</div>
          <h1>{title ?? copy.title}</h1>
          <p>{description ?? copy.description}</p>
          {cta ? <div className="tier-one-route-card__cta">{cta}</div> : null}
        </aside>
      ) : null}
    </SpatialShell>
  );
}
