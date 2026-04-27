import type { UraiMemoryEvent } from "./types";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function computeMemoryWeight(memory?: Partial<UraiMemoryEvent> | null, now = Date.now()): number {
  if (!memory) return 0.35;

  const timestamp = typeof memory.timestamp === "number" ? memory.timestamp : now;
  const ageDays = Math.max(0, (now - timestamp) / 86400000);
  const recency = Math.exp(-ageDays / 45);

  if (typeof memory.finalWeight === "number") return clamp01(memory.finalWeight);
  if (typeof memory.memoryWeight === "number") return clamp01(memory.memoryWeight);

  return clamp01(
    (memory.baseWeight ?? 0.35) * 0.18 +
    recency * 0.12 +
    (memory.emotionalWeight ?? 0.35) * 0.28 +
    (memory.recurrenceWeight ?? 0.2) * 0.18 +
    (memory.interactionWeight ?? 0.2) * 0.12 +
    (memory.shadowWeight ?? 0) * 0.12
  );
}
