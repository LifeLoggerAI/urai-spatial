import type { PassiveEvent, StateWindow, UserBaseline } from "./types";

const WINDOW_MS = 20 * 60 * 1000;

export function buildStateWindows(events: PassiveEvent[], baseline: UserBaseline): StateWindow[] {
  if (!events.length) return [];

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const min = sorted[0].timestamp;
  const max = sorted[sorted.length - 1].timestamp;
  const windows: StateWindow[] = [];

  for (let start = min; start <= max; start += WINDOW_MS) {
    const end = start + WINDOW_MS;
    const slice = sorted.filter(e => e.timestamp >= start && e.timestamp < end);
    if (!slice.length) continue;

    const appSwitchCount = slice.filter(e => e.type === "app_switch").length;
    const unlockCount = slice.filter(e => e.type === "screen_unlock").length;
    const notificationOpenCount = slice.filter(e => e.type === "notification_open").length;
    const movementScore = slice.filter(e => e.type === "movement_sample").reduce((s, e) => s + Number(e.value ?? 0), 0);
    const idleMinutes = slice.filter(e => e.type === "screen_idle").reduce((s, e) => s + Number(e.value ?? 1), 0);

    const lowSwitch = appSwitchCount <= baseline.appSwitchesPer20Min * 0.7;
    const lowNotify = notificationOpenCount <= 1;
    const lowUnlock = unlockCount <= baseline.unlocksPer20Min;
    const sessionDepthScore = [lowSwitch, lowNotify, lowUnlock].filter(Boolean).length / 3;

    const agitationPenalty =
      appSwitchCount / Math.max(1, baseline.appSwitchesPer20Min) +
      unlockCount / Math.max(1, baseline.unlocksPer20Min);

    const energyRatio = movementScore / Math.max(1, baseline.movementPerHour / 3);
    const stateScore = Math.max(0, Math.min(1, 0.55 * energyRatio + 0.45 * sessionDepthScore - 0.12 * agitationPenalty));

    windows.push({
      id: `window_${start}_${end}`,
      userId: baseline.userId,
      start,
      end,
      appSwitchCount,
      unlockCount,
      notificationOpenCount,
      movementScore,
      idleMinutes,
      sessionDepthScore,
      stateScore,
    });
  }

  return windows;
}

export function windowsAfter(windows: StateWindow[], timestamp: number, durationMs: number): StateWindow[] {
  return windows.filter(w => w.start >= timestamp && w.start <= timestamp + durationMs);
}
