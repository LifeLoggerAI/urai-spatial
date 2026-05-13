"use client";

import { useEffect, useState } from "react";
import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);

function resolveRouteMode(rawMode: string | null): TierOneExperienceMode {
  return rawMode && allowedModes.has(rawMode as TierOneExperienceMode) ? (rawMode as TierOneExperienceMode) : "home";
}

function modeFromBrowserUrl(): TierOneExperienceMode {
  if (typeof window === "undefined") return "home";
  return resolveRouteMode(new URLSearchParams(window.location.search).get("mode"));
}

export function RootModeExperience() {
  const [mode, setMode] = useState<TierOneExperienceMode>(() => modeFromBrowserUrl());

  useEffect(() => {
    const syncMode = () => setMode(modeFromBrowserUrl());
    syncMode();
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
  }, []);

  return <TierOneExperience mode={mode} />;
}
