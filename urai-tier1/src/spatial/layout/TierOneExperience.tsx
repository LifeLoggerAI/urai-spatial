"use client";

import UraiSpatialStage from "@/spatial/v1/UraiSpatialStage";

export type SceneMode = "home" | "ascent" | "life-map" | "demo" | "replay" | "focus" | "unwind" | "mirror";
export type TierOneExperienceMode = SceneMode;

type Props = {
  mode?: SceneMode;
};

function initialModeFor(mode: SceneMode) {
  if (mode === "life-map" || mode === "demo") return "life-map";
  return mode;
}

export function TierOneExperience({ mode = "home" }: Props) {
  /* Canonical runtime handoff: <HomeScene sceneMode={mode} /> has been superseded by V1 stage. */
  return <UraiSpatialStage initialMode={initialModeFor(mode)} routeSceneMode={mode} />;
}
