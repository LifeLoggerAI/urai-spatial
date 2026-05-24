"use client";

import { useEffect, useState } from "react";
import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);

function resolveRouteMode(rawMode: string | null): TierOneExperienceMode {
  return rawMode && allowedModes.has(rawMode as TierOneExperienceMode) ? (rawMode as TierOneExperienceMode) : "home";
}

function modeFromBrowserUrl(fallbackMode: TierOneExperienceMode): TierOneExperienceMode {
  if (typeof window === "undefined") return fallbackMode;
  return resolveRouteMode(new URLSearchParams(window.location.search).get("mode"));
}

export function RootModeExperience({ initialMode = "home" }: { initialMode?: TierOneExperienceMode }) {
  const [mode, setMode] = useState<TierOneExperienceMode>(() => initialMode);

  useEffect(() => {
    const syncMode = () => setMode(modeFromBrowserUrl(initialMode));
    const interval = window.setInterval(syncMode, 100);
    window.addEventListener("popstate", syncMode);
    window.addEventListener("hashchange", syncMode);
    window.addEventListener("urai:sync-route-mode", syncMode);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("popstate", syncMode);
      window.removeEventListener("hashchange", syncMode);
      window.removeEventListener("urai:sync-route-mode", syncMode);
    };
  }, [initialMode]);

  return <TierOneExperience mode={mode} />;
}
