"use client";

import React, { Suspense } from "react";
import HomeScene from "@/scene/HomeScene";
import { SpatialShell } from "./SpatialShell";

export type TierOneExperienceMode = "home" | "life-map" | "demo" | "replay" | "focus" | "mirror";

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
    title: "Your life, rendered as atmosphere.",
    description: "A cinematic home layer where mood, memory, and focus begin as a living spatial scene.",
  },
  "life-map": {
    eyebrow: "Life Map",
    title: "A symbolic constellation of remembered moments.",
    description: "Tap stars to move from the sky into memory bloom, emotional replay, and pattern recognition.",
  },
  demo: {
    eyebrow: "Demo",
    title: "A guided preview of the URAI Spatial engine.",
    description: "This launch demo shows the emotional map, companion orb, and cinematic memory field without requiring private data.",
  },
  replay: {
    eyebrow: "Replay",
    title: "Replay mode is ready for your first life chapter.",
    description: "When memory data connects, this view becomes a cinematic walk back through moments, tone shifts, and recovery arcs.",
  },
  focus: {
    eyebrow: "Focus",
    title: "A calm attention field for returning to center.",
    description: "The scene quiets into a focused companion state while deeper cognitive guidance comes online.",
  },
  mirror: {
    eyebrow: "Mirror",
    title: "Cognitive mirror fallback is live.",
    description: "Tier-1 keeps the reflection route polished while richer pattern summaries and private data sync are connected.",
  },
};

function shellModeFor(mode: TierOneExperienceMode) {
  if (mode === "replay") return "replay" as const;
  if (mode === "focus" || mode === "mirror") return "detail" as const;
  if (mode === "life-map") return "sky" as const;
  return "overview" as const;
}

export function TierOneExperience({ mode, title, eyebrow, description, cta }: Props) {
  const copy = fallbackCopy[mode];

  return (
    <SpatialShell mode={shellModeFor(mode)}>
      <Suspense fallback={<div className="tier-one-loading">Loading URAI Spatial...</div>}>
        <HomeScene sceneMode={mode} />
      </Suspense>

      <aside className="tier-one-route-card" data-route-mode={mode}>
        <div className="tier-one-route-card__eyebrow">{eyebrow ?? copy.eyebrow}</div>
        <h1>{title ?? copy.title}</h1>
        <p>{description ?? copy.description}</p>
        {cta ? <div className="tier-one-route-card__cta">{cta}</div> : null}
      </aside>
    </SpatialShell>
  );
}
