import type { PassiveEvent, UserBaseline } from "./types";

export function buildFallbackBaseline(userId: string): UserBaseline {
  return {
    userId,
    appSwitchesPer20Min: 8,
    unlocksPer20Min: 3,
    movementPerHour: 50,
    avgSessionLengthMin: 12,
    avgReplyDelayMin: 18,
    idleMinutesPer20Min: 6,
    updatedAt: Date.now(),
    trustScore: 0.25,
  };
}

export function estimateBaseline(userId: string, events: PassiveEvent[]): UserBaseline {
  if (events.length < 25) return buildFallbackBaseline(userId);

  const now = Date.now();
  const spanHours = Math.max(1, (now - Math.min(...events.map(e => e.timestamp))) / 3600000);
  const appSwitches = events.filter(e => e.type === "app_switch").length;
  const unlocks = events.filter(e => e.type === "screen_unlock").length;
  const movement = events.filter(e => e.type === "movement_sample").reduce((s, e) => s + Number(e.value ?? 0), 0);
  const idle = events.filter(e => e.type === "screen_idle").reduce((s, e) => s + Number(e.value ?? 1), 0);

  return {
    userId,
    appSwitchesPer20Min: Math.max(1, appSwitches / spanHours / 3),
    unlocksPer20Min: Math.max(1, unlocks / spanHours / 3),
    movementPerHour: Math.max(1, movement / spanHours),
    avgSessionLengthMin: 12,
    avgReplyDelayMin: 18,
    idleMinutesPer20Min: Math.max(1, idle / spanHours / 3),
    updatedAt: now,
    trustScore: 0.25,
  };
}
