"use client";

import UraiSpatialStage from "@/spatial/v1/UraiSpatialStage";

export type SceneMode = "home" | "ascent" | "life-map" | "demo" | "replay" | "focus" | "unwind" | "mirror";
export type TierOneExperienceMode = SceneMode;

type Props = {
  mode?: SceneMode;
};

export function TierOneExperience({ mode = "home" }: Props) {
  /* Canonical runtime handoff: <HomeScene sceneMode={mode} /> has been superseded by V1 stage. */
  void mode;
  return <UraiSpatialStage />;
}
