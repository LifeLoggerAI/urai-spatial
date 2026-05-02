import type { InsightCandidate, StateWindow, UserBaseline } from "../types";
import { generateInsightSentence } from "../sentenceEngine";

function label(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function detectFocusBurst(
  windows: StateWindow[],
  baseline: UserBaseline
): InsightCandidate[] {
  const out: InsightCandidate[] = [];

  for (const w of windows) {
    if (
      w.sessionDepthScore > 0.75 &&
      w.appSwitchCount < baseline.appSwitchesPer20Min * 0.6 &&
      w.notificationOpenCount < 2
    ) {
      const confidence = Math.min(0.9, 0.68 + w.sessionDepthScore * 0.18);
      out.push({
        id: `focus_burst_${w.start}`,
        userId: baseline.userId,
        insightType: "focus_burst",
        title: "Focus window",
        sentence: generateInsightSentence(
          "focus_burst",
          { startLabel: label(w.start), endLabel: label(w.end) },
          confidence
        ),
        confidence,
        severity: "medium",
        start: w.start,
        end: w.end,
        evidence: [
          { signal: "session_depth_score", observed: w.sessionDepthScore.toFixed(2), baseline: "0.75", weight: 0.5 },
          { signal: "app_switch_count", observed: w.appSwitchCount, baseline: baseline.appSwitchesPer20Min.toFixed(1), weight: 0.35 },
          { signal: "notification_opens", observed: w.notificationOpenCount, baseline: 2, weight: 0.15 },
        ],
      });
    }
  }

  return out;
}
