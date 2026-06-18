"use client";

import { useSyncExternalStore } from "react";
import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);

function resolveRouteMode(rawMode: string | null): TierOneExperienceMode {
  return rawMode && allowedModes.has(rawMode as TierOneExperienceMode) ? (rawMode as TierOneExperienceMode) : "home";
}

function modeFromBrowserUrl(fallbackMode: TierOneExperienceMode): TierOneExperienceMode {
  if (typeof window === "undefined") return fallbackMode;
  return resolveRouteMode(new URLSearchParams(window.location.search).get("mode"));
}

function subscribeToRouteMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const interval = window.setInterval(onStoreChange, 50);
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("urai:sync-route-mode", onStoreChange);
  queueMicrotask(onStoreChange);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("urai:sync-route-mode", onStoreChange);
  };
}

export function RootModeExperience({ initialMode = "home" }: { initialMode?: TierOneExperienceMode }) {
  const mode = useSyncExternalStore(
    subscribeToRouteMode,
    () => modeFromBrowserUrl(initialMode),
    () => initialMode,
  );

  return <TierOneExperience mode={mode} />;
}
