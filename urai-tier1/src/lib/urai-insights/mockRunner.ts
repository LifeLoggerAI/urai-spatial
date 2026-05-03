import type { PassiveEvent } from "./types";
import { buildFallbackBaseline } from "./baselines";
import { runPrecomputedInsightEngine } from "./insightEngine";

const userId = "mock_user";
const now = Date.now();

export const mockPassiveEvents: PassiveEvent[] = [
  { id: "call_1", userId, type: "call_end", timestamp: now - 70 * 60000, contactId: "contact_a", value: 12 },
  { id: "idle_1", userId, type: "screen_idle", timestamp: now - 60 * 60000, value: 14 },
  { id: "move_1", userId, type: "movement_sample", timestamp: now - 55 * 60000, value: 5 },
  { id: "move_2", userId, type: "movement_sample", timestamp: now - 35 * 60000, value: 6 },
  { id: "unlock_1", userId, type: "screen_unlock", timestamp: now - 25 * 60000 },
  { id: "switch_1", userId, type: "app_switch", timestamp: now - 24 * 60000 },
  { id: "switch_2", userId, type: "app_switch", timestamp: now - 23 * 60000 },
  { id: "switch_3", userId, type: "app_switch", timestamp: now - 22 * 60000 },
  { id: "switch_4", userId, type: "app_switch", timestamp: now - 21 * 60000 },
];

export function runMockInsightSpine() {
  const baseline = buildFallbackBaseline(userId);
  return runPrecomputedInsightEngine(userId, mockPassiveEvents, baseline);
}
