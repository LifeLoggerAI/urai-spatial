import type { LifeMapPhase } from "./lifeMapModel";

export type LifemapNarratorEvent =
  | "lifemap.star.glow"
  | "lifemap.star.focus"
  | "lifemap.cluster.focus"
  | "lifemap.star.resolved";

type NarratorBase = {
  timestamp: number;
};

type StarEventBase = NarratorBase & {
  starId: string;
  chapterId: string;
  emotion: string;
};

export type LifemapStarGlowPayload = StarEventBase & {
  event: "lifemap.star.glow";
};

export type LifemapStarFocusPayload = StarEventBase & {
  event: "lifemap.star.focus";
};

export type LifemapClusterFocusPayload = NarratorBase & {
  event: "lifemap.cluster.focus";
  chapterId: string;
  starId?: string;
  emotion?: string;
};

export type LifemapStarResolvedPayload = StarEventBase & {
  event: "lifemap.star.resolved";
};

export type LifemapNarratorPayload =
  | LifemapStarGlowPayload
  | LifemapStarFocusPayload
  | LifemapClusterFocusPayload
  | LifemapStarResolvedPayload;

export type LifemapTimelineSyncPayload = {
  mode: "lifemap";
  phase: LifeMapPhase;
  timestamp: number;
  activeChapterId: string;
  activeStarId?: string;
};

const requireNonEmpty = (name: string, value: string | null | undefined) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const now = () => Date.now();

export function buildStarGlowPayload(input: {
  starId: string;
  chapterId: string;
  emotion: string;
  timestamp?: number;
}): LifemapStarGlowPayload {
  return {
    event: "lifemap.star.glow",
    starId: requireNonEmpty("starId", input.starId),
    chapterId: requireNonEmpty("chapterId", input.chapterId),
    emotion: requireNonEmpty("emotion", input.emotion),
    timestamp: input.timestamp ?? now(),
  };
}

export function buildStarFocusPayload(input: {
  starId: string;
  chapterId: string;
  emotion: string;
  timestamp?: number;
}): LifemapStarFocusPayload {
  return {
    event: "lifemap.star.focus",
    starId: requireNonEmpty("starId", input.starId),
    chapterId: requireNonEmpty("chapterId", input.chapterId),
    emotion: requireNonEmpty("emotion", input.emotion),
    timestamp: input.timestamp ?? now(),
  };
}

export function buildClusterFocusPayload(input: {
  chapterId: string;
  starId?: string;
  emotion?: string;
  timestamp?: number;
}): LifemapClusterFocusPayload {
  return {
    event: "lifemap.cluster.focus",
    chapterId: requireNonEmpty("chapterId", input.chapterId),
    ...(input.starId ? { starId: requireNonEmpty("starId", input.starId) } : {}),
    ...(input.emotion ? { emotion: requireNonEmpty("emotion", input.emotion) } : {}),
    timestamp: input.timestamp ?? now(),
  };
}

export function buildStarResolvedPayload(input: {
  starId: string;
  chapterId: string;
  emotion: string;
  timestamp?: number;
}): LifemapStarResolvedPayload {
  return {
    event: "lifemap.star.resolved",
    starId: requireNonEmpty("starId", input.starId),
    chapterId: requireNonEmpty("chapterId", input.chapterId),
    emotion: requireNonEmpty("emotion", input.emotion),
    timestamp: input.timestamp ?? now(),
  };
}

export function buildTimelineSyncPayload(input: {
  phase: LifeMapPhase;
  activeChapterId: string;
  activeStarId?: string;
  timestamp?: number;
}): LifemapTimelineSyncPayload {
  return {
    mode: "lifemap",
    phase: input.phase,
    activeChapterId: requireNonEmpty("activeChapterId", input.activeChapterId),
    ...(input.activeStarId ? { activeStarId: requireNonEmpty("activeStarId", input.activeStarId) } : {}),
    timestamp: input.timestamp ?? now(),
  };
}

export function emitLifemapNarrator(payload: LifemapNarratorPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("urai:narrator", { detail: payload }));
}

export function emitLifemapTimelineSync(payload: LifemapTimelineSyncPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("urai:timeline-sync", { detail: payload }));
}
