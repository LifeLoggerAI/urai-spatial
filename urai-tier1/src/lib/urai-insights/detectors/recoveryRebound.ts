import type { InsightCandidate, StateWindow, UserBaseline } from "../types";
import { generateInsightSentence } from "../sentenceEngine";

export function detectRecoveryRebound(
  windows: StateWindow[],
  baseline: UserBaseline
): InsightCandidate[] {
  const out: InsightCandidate[] = [];

  for (let i = 1; i < windows.length; i++) {
    const prev = windows[i - 1];
    const current = windows[i];

    if (prev.stateScore < 0.45 && current.stateScore > 0.7) {
      const confidence = Math.min(0.88, 0.66 + (current.stateScore - prev.stateScore) * 0.35);
      const durationMinutes = Math.round((current.end - prev.start) / 60000);

      out.push({
        id: `recovery_rebound_${current.start}`,
        userId: baseline.userId,
        insightType: "recovery_rebound",
        title: "Recovery rebound",
        sentence: generateInsightSentence("recovery_rebound", { durationMinutes }, confidence),
        confidence,
        severity: "medium",
        start: prev.start,
        end: current.end,
        evidence: [
          { signal: "previous_state_score", observed: prev.stateScore.toFixed(2), baseline: "0.45", weight: 0.4 },
          { signal: "current_state_score", observed: current.stateScore.toFixed(2), baseline: "0.70", weight: 0.4 },
          { signal: "movement_score", observed: current.movementScore, baseline: Math.round(baseline.movementPerHour / 3), weight: 0.2 },
        ],
      });
    }
  }

  return out;
}
