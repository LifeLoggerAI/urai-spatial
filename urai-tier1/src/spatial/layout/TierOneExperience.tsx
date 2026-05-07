"use client";

import React, { Suspense } from "react";
import HomeScene from "@/scene/HomeScene";
import { SpatialShell } from "./SpatialShell";

export type TierOneExperienceMode = "home" | "ascent" | "life-map" | "demo" | "replay" | "focus" | "mirror";

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
    title: "Your inner weather, rendered as a world.",
    description: "A calm cinematic home where the sky, ground, and companion orb become the entry point into memory, mood, and focus.",
  },
  ascent: {
    eyebrow: "Ascent",
    title: "Rise from the home sky into your Life Map.",
    description: "A short atmospheric passage shifts the scene from grounded presence into the constellation layer.",
  },
  "life-map": {
    eyebrow: "Life Map",
    title: "A constellation of remembered moments.",
    description: "Stars become memory anchors. Tap one to move into focus, replay, and pattern recognition.",
  },
  demo: {
    eyebrow: "Demo",
    title: "A guided preview of the URAI Spatial engine.",
    description: "Explore the emotional map, companion field, and cinematic memory layer without connecting private data.",
  },
  replay: {
    eyebrow: "Replay",
    title: "Replay turns a memory into atmosphere.",
    description: "This route becomes a cinematic return path through tone shifts, recovery arcs, and emotional context.",
  },
  focus: {
    eyebrow: "Focus",
    title: "A memory star, opened gently.",
    description: "Focus mode slows the scene down so one memory can become readable before replay begins.",
  },
  mirror: {
    eyebrow: "Mirror",
    title: "Reflection begins with a stable field.",
    description: "The mirror route keeps the scene grounded while deeper pattern summaries and private data sync come online.",
  },
};

function shellModeFor(mode: TierOneExperienceMode) {
  if (mode === "replay") return "replay" as const;
  if (mode === "focus" || mode === "mirror") return "detail" as const;
  if (mode === "ascent" || mode === "life-map") return "sky" as const;
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
