"use client";

import React, { Suspense } from "react";
import HomeScene from "@/scene/HomeScene";
import { SpatialShell } from "./SpatialShell";

export type TierOneExperienceMode = "home" | "life-map" | "demo" | "replay" | "focus";

type Props = {
  mode: TierOneExperienceMode;
  title?: string;
  eyebrow?: string;
  description?: string;
  cta?: React.ReactNode;
};

const fallbackCopy: Record<TierOneExperienceMode, { eyebrow: string; title: string; description: string }> = {
  home: { eyebrow: "URAI Spatial", title: "Cinematic home", description: "Launch view for the Tier-1 spatial runtime." },
  "life-map": { eyebrow: "Life Map", title: "Symbolic constellation", description: "Clustered stars and soft links for the launch demo." },
  demo: { eyebrow: "Demo", title: "Demo-ready scene", description: "Guided launch view with clean UI." },
  replay: { eyebrow: "Replay", title: "Replay fallback", description: "Polished route shell while live data is connected." },
  focus: { eyebrow: "Focus", title: "Focus fallback", description: "Stable detail route shell for Tier-1." },
};

export function TierOneExperience({ mode, title, eyebrow, description, cta }: Props) {
  const copy = fallbackCopy[mode];
  return (
    <SpatialShell mode={mode === "replay" ? "replay" : mode === "focus" ? "detail" : "overview"}>
      <Suspense fallback={<div className="tier-one-loading">Loading URAI Spatial...</div>}>
        <HomeScene />
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
