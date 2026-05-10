"use client";

import React, { Suspense, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import HomeScene from "@/scene/HomeScene";
import MirrorRouteLayer from "@/scene/MirrorRouteLayer";
import { modeFromRouteMode, URAI_CAMERA_PRESETS, type UraiSpatialWorldMode } from "@/spatial/world/uraiSpatialWorldModel";
import { HomeCohesionLayer } from "./HomeCohesionLayer";
import { SpatialCinematicContinuityLayer } from "./SpatialCinematicContinuityLayer";
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
    eyebrow: "URAI Spatial Preview",
    title: "A calm spatial preview of your inner world.",
    description: "Explore Home, LifeMap, replay, and reflection through privacy-safe sample moments. This public preview is symbolic and does not expose raw personal data.",
  },
  ascent: {
    eyebrow: "Opening LifeMap Preview",
    title: "Your Life Map is forming.",
    description: "Demo moments become constellations so you can feel the interface without connecting private providers.",
  },
  "life-map": {
    eyebrow: "LifeMap Preview",
    title: "Symbolic moments are visible.",
    description: "Select a star to review its sample pattern, replay path, and reflection summary. This view uses public-safe demo data.",
  },
  demo: {
    eyebrow: "Public-Safe Demo",
    title: "Preview URAI Spatial without private data.",
    description: "Explore the map, focus view, and replay flow using local sample moments designed to show the product shape honestly.",
  },
  replay: {
    eyebrow: "Replay Preview",
    title: "Watch a sample pattern replay.",
    description: "Replay shows a guided symbolic sequence with clear controls, privacy context, and a safe exit path.",
  },
  focus: {
    eyebrow: "Focus Preview",
    title: "Review this selected sample moment.",
    description: "Check the symbolic context, readiness, privacy state, and replay action before starting.",
  },
  unwind: {
    eyebrow: "Unwind",
    title: "Return to a safe spatial state.",
    description: "Pause the replay layer, settle the scene, and choose whether to revisit the LifeMap or return home.",
  },
  mirror: {
    eyebrow: "Reflection Preview",
    title: "This sample shows a calm recovery pattern.",
    description: "Review the symbolic pattern summary, privacy status, and suggested next moment. This is reflection language, not diagnosis.",
  },
};

function shellModeFor(mode: TierOneExperienceMode) {
  if (mode === "replay") return "replay" as const;
  if (mode === "focus" || mode === "mirror" || mode === "unwind") return "detail" as const;
  if (mode === "ascent" || mode === "life-map") return "sky" as const;
  return "overview" as const;
}

function shouldShowRouteCard(mode: TierOneExperienceMode, hasCustomRouteContent: boolean) {
  if (mode === "home") return false;
  if (mode === "ascent") return false;
  if (mode === "life-map") return false;
  if (mode === "focus") return false;
  if (mode === "replay") return false;
  if (mode === "mirror") return false;
  if (mode === "unwind") return false;

  return hasCustomRouteContent;
}

export function TierOneExperience({ mode, title, eyebrow, description, cta }: Props) {
  const copy = fallbackCopy[mode];
  const router = useRouter();
  const openLifeMap = useCallback(() => router.push("/life-map", { scroll: false }), [router]);
  const openHome = useCallback(() => router.push("/", { scroll: false }), [router]);

  // Canonical cinematic modes stay inside HomeScene/overlay authority.
  const showRouteCard = shouldShowRouteCard(mode, Boolean(title || eyebrow || description || cta));

  const worldMode = useMemo<UraiSpatialWorldMode>(() => modeFromRouteMode(mode), [mode]);
  const cameraPreset = URAI_CAMERA_PRESETS[worldMode];

  return (
    <SpatialShell mode={shellModeFor(mode)} sourceBadge="demo">
      <div
        data-testid="urai-spatial-world-root"
        data-urai-world-layer="3d"
        data-urai-dom-role="accessible-control-overlay"
        data-urai-world-mode={worldMode}
        data-urai-camera-position={cameraPreset.position.join(",")}
        data-urai-camera-target={cameraPreset.target.join(",")}
        data-urai-camera-fov={cameraPreset.fov}
        data-urai-fallback-mode="webgl"
      >
        <Suspense fallback={null}>
          <HomeScene sceneMode={mode} />
          {mode === "mirror" ? <MirrorRouteLayer onLifeMap={openLifeMap} onHome={openHome} /> : null}
        </Suspense>
      </div>

      <SpatialCinematicContinuityLayer mode={mode} />
      <HomeCohesionLayer enabled={mode === "home"} />

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