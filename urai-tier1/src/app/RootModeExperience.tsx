"use client";

import { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);

type Props = {
  home: ReactNode;
};

function resolveRouteMode(rawMode: string | null): TierOneExperienceMode {
  return rawMode && allowedModes.has(rawMode as TierOneExperienceMode) ? (rawMode as TierOneExperienceMode) : "home";
}

export function RootModeExperience({ home }: Props) {
  const params = useSearchParams();
  const mode = resolveRouteMode(params.get("mode"));

  if (mode === "home") return <>{home}</>;

  return <TierOneExperience mode={mode} />;
}
