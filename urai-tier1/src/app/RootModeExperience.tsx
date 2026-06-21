"use client";

import { useEffect, useSyncExternalStore } from "react";
import { TierOneExperience, type TierOneExperienceMode } from "@/spatial/layout/TierOneExperience";

const allowedModes = new Set<TierOneExperienceMode>(["home", "ascent", "life-map", "demo", "replay", "focus", "unwind", "mirror"]);
const emptySelectedNodeId = "";

const launchMemoryAliases: Record<string, string> = {
  "blue-fog": "week-heavy-fog",
  "blue-fog-memory": "week-heavy-fog",
  galaxy: "quiet-reset",
  spark: "first-signal-recovery",
  recovery: "first-signal-recovery",
  passport: "purpose-thread-visible",
};

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
  if (pathMode === "privacy-controls") return "mirror";
  return allowedModes.has(pathMode as TierOneExperienceMode) ? (pathMode as TierOneExperienceMode) : undefined;
}

function normalizeSelectedNodeId(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const decoded = decodeURIComponent(value).trim();
  return launchMemoryAliases[decoded] ?? decoded;
}

function selectedNodeIdFromParams(params: URLSearchParams): string | undefined {
  return normalizeSelectedNodeId(
    params.get("memoryId") ||
      params.get("memory") ||
      params.get("nodeId") ||
      params.get("star") ||
      params.get("spark"),
  );
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
  const selectedNodeId = selectedNodeIdFromParams(params);
  const explicitMode = resolveRouteMode(params.get("mode"), pathMode ?? fallbackMode);
  const legacyStarShouldOpenFocus = Boolean(selectedNodeId && (params.has("star") || params.has("spark")));

  return {
    mode: legacyStarShouldOpenFocus ? "focus" : explicitMode,
    selectedNodeId,
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
  useEffect(() => {
    document.documentElement.dataset.uraiRuntimeReady = "true";
    return () => {
      delete document.documentElement.dataset.uraiRuntimeReady;
    };
  }, []);

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
