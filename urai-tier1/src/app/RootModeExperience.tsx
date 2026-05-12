"use client";

import { ReactNode, useEffect, useState } from "react";
import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);

type Props = {
  home: ReactNode;
};

function resolveRouteMode(rawMode: string | null): TierOneExperienceMode {
  return rawMode && allowedModes.has(rawMode as TierOneExperienceMode) ? (rawMode as TierOneExperienceMode) : "home";
}

function modeFromBrowserUrl(): TierOneExperienceMode {
  if (typeof window === "undefined") return "home";
  return resolveRouteMode(new URLSearchParams(window.location.search).get("mode"));
}

export function RootModeExperience({ home }: Props) {
  const [mode, setMode] = useState<TierOneExperienceMode>("home");

  useEffect(() => {
    const syncMode = () => setMode(modeFromBrowserUrl());
    syncMode();
    window.addEventListener("popstate", syncMode);
    window.addEventListener("hashchange", syncMode);
    return () => {
      window.removeEventListener("popstate", syncMode);
      window.removeEventListener("hashchange", syncMode);
    };
  }, []);

  if (mode === "home") return <>{home}</>;

  return <TierOneExperience mode={mode} />;
}
