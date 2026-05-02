import type { InsightCandidate, PassiveEvent, StateWindow, UserBaseline } from "../types";
import { windowsAfter } from "../windowing";
import { generateInsightSentence } from "../sentenceEngine";

export function detectPostCallEnergyDrop(
  events: PassiveEvent[],
  windows: StateWindow[],
  baseline: UserBaseline
): InsightCandidate[] {
  const results: InsightCandidate[] = [];
  const calls = events.filter(e => e.type === "call_end" && Number(e.value ?? 0) >= 3);

  for (const call of calls) {
    const post = windowsAfter(windows, call.timestamp, 60 * 60 * 1000);
    if (!post.length) continue;

    const avgMove = post.reduce((s, w) => s + w.movementScore, 0) / post.length;
    const avgIdle = post.reduce((s, w) => s + w.idleMinutes, 0) / post.length;
    const movementBaseline20 = baseline.movementPerHour / 3;

    if (avgMove < movementBaseline20 * 0.75 && avgIdle > baseline.idleMinutesPer20Min * 1.25) {
      const confidence = Math.min(0.92, 0.66 + (1 - avgMove / Math.max(1, movementBaseline20)) * 0.2);
      const start = call.timestamp;
      const end = post[post.length - 1].end;
      const durationMinutes = Math.round((end - start) / 60000);

      results.push({
        id: `post_call_energy_drop_${start}`,
        userId: baseline.userId,
        insightType: "post_call_energy_drop",
        title: "Post-call energy drop",
        sentence: generateInsightSentence("post_call_energy_drop", { durationMinutes }, confidence),
        confidence,
        severity: confidence > 0.82 ? "high" : "medium",
        start,
        end,
        relatedContactId: call.contactId,
        evidence: [
          { signal: "movement_after_call", observed: Math.round(avgMove), baseline: Math.round(movementBaseline20), weight: 0.45 },
          { signal: "idle_minutes_after_call", observed: Math.round(avgIdle), baseline: Math.round(baseline.idleMinutesPer20Min), weight: 0.35 },
          { signal: "call_duration_minutes", observed: Number(call.value ?? 0), baseline: 3, weight: 0.2 },
        ],
      });
    }
  }

  return results;
}
