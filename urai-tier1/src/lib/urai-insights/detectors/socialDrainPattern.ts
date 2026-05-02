import type { InsightCandidate, PassiveEvent, StateWindow, UserBaseline } from "../types";
import { windowsAfter } from "../windowing";
import { generateInsightSentence } from "../sentenceEngine";

export function detectSocialDrainPattern(
  events: PassiveEvent[],
  windows: StateWindow[],
  baseline: UserBaseline
): InsightCandidate[] {
  const contactDrops = new Map<string, { count: number; lastStart: number; totalDrop: number }>();
  const interactions = events.filter(e =>
    (e.type === "call_end" || e.type === "message_received" || e.type === "message_sent") && e.contactId
  );

  for (const event of interactions) {
    const post = windowsAfter(windows, event.timestamp, 45 * 60 * 1000);
    if (!post.length) continue;
    const avgState = post.reduce((s, w) => s + w.stateScore, 0) / post.length;
    const drop = 0.7 - avgState;
    if (drop > 0.25) {
      const key = event.contactId as string;
      const prev = contactDrops.get(key) ?? { count: 0, lastStart: event.timestamp, totalDrop: 0 };
      contactDrops.set(key, { count: prev.count + 1, lastStart: event.timestamp, totalDrop: prev.totalDrop + drop });
    }
  }

  const results: InsightCandidate[] = [];

  for (const [contactId, data] of contactDrops.entries()) {
    if (data.count >= 3) {
      const avgDrop = data.totalDrop / data.count;
      const confidence = Math.min(0.9, 0.64 + data.count * 0.05 + avgDrop * 0.2);

      results.push({
        id: `social_drain_pattern_${contactId}_${data.lastStart}`,
        userId: baseline.userId,
        insightType: "social_drain_pattern",
        title: "Recurring social rhythm shift",
        sentence: generateInsightSentence("social_drain_pattern", { count: data.count }, confidence),
        confidence,
        severity: confidence > 0.82 ? "high" : "medium",
        start: data.lastStart,
        end: data.lastStart + 45 * 60 * 1000,
        relatedContactId: contactId,
        evidence: [
          { signal: "repeated_post_contact_drops", observed: data.count, baseline: 3, weight: 0.5 },
          { signal: "average_state_drop", observed: avgDrop.toFixed(2), baseline: "0.25", weight: 0.35 },
          { signal: "trust_required", observed: baseline.trustScore ?? 0, baseline: 0.75, weight: 0.15 },
        ],
      });
    }
  }

  return results;
}
