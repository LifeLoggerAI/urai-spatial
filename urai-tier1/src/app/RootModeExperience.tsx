"use client";

import { useSyncExternalStore } from "react";
import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);
const emptySelectedNodeId = "";

type RouteSnapshot = {
  mode: TierOneExperienceMode;
  selectedNodeId?: string;
};

function resolveRouteMode(rawMode: string | null | undefined, fallbackMode: TierOneExperienceMode = "home"): TierOneExperienceMode {
  return rawMode && allowedModes.has(rawMode as TierOneExperienceMode) ? (rawMode as TierOneExperienceMode) : fallbackMode;
}

function modeFromPathname(pathname: string): TierOneExperienceMode | undefined {
  const [firstSegment, secondSegment] = pathname.split("/").filter(Boolean);
  const pathMode = firstSegment === "spatial" ? secondSegment : firstSegment;

  if (!pathMode || pathMode === "home") return "home";
  return allowedModes.has(pathMode as TierOneExperienceMode) ? (pathMode as TierOneExperienceMode) : undefined;
}

function selectedNodeIdFromParams(params: URLSearchParams): string | undefined {
  return params.get("memoryId") || params.get("memory") || params.get("nodeId") || undefined;
}

function routeKeyFromSnapshot(snapshot: RouteSnapshot): string {
  return `${snapshot.mode}::${snapshot.selectedNodeId ?? emptySelectedNodeId}`;
}

function routeSnapshotFromKey(key: string): RouteSnapshot {
  const [rawMode, selectedNodeId = emptySelectedNodeId] = key.split("::");
  return {
    mode: resolveRouteMode(rawMode, "home"),
    selectedNodeId: selectedNodeId || undefined,
  };
}

function routeSnapshotFromBrowserUrl(fallbackMode: TierOneExperienceMode): RouteSnapshot {
  if (typeof window === "undefined") return { mode: fallbackMode };

  const params = new URLSearchParams(window.location.search);
  const pathMode = modeFromPathname(window.location.pathname);

  return {
    mode: resolveRouteMode(params.get("mode"), pathMode ?? fallbackMode),
    selectedNodeId: selectedNodeIdFromParams(params),
  };
}

function subscribeToRouteMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const interval = window.setInterval(onStoreChange, 150);
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
  const routeKey = useSyncExternalStore(
    subscribeToRouteMode,
    () => routeKeyFromSnapshot(routeSnapshotFromBrowserUrl(initialMode)),
    () => routeKeyFromSnapshot({ mode: initialMode }),
  );
  const { mode, selectedNodeId } = routeSnapshotFromKey(routeKey);

  return (
    <div
      data-testid="urai-root-mode-stage"
      data-mode={mode}
      data-scene-mode={mode}
      data-root-route-mode={mode}
      data-selected-node-id={selectedNodeId ?? ""}
      style={{ position: "relative", minHeight: "100svh" }}
    >
      <TierOneExperience mode={mode} selectedNodeId={selectedNodeId} />
    </div>
  );
}
