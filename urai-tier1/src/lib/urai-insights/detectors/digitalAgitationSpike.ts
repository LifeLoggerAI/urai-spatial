import type { InsightCandidate, StateWindow, UserBaseline } from "../types";
import { generateInsightSentence } from "../sentenceEngine";

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function detectDigitalAgitationSpike(
  windows: StateWindow[],
  baseline: UserBaseline
): InsightCandidate[] {
  return windows
    .filter(w =>
      w.appSwitchCount > baseline.appSwitchesPer20Min * 2 ||
      w.unlockCount > baseline.unlocksPer20Min * 2
    )
    .map(w => {
      const switchRatio = w.appSwitchCount / Math.max(1, baseline.appSwitchesPer20Min);
      const unlockRatio = w.unlockCount / Math.max(1, baseline.unlocksPer20Min);
      const confidence = Math.min(0.94, 0.62 + Math.max(switchRatio, unlockRatio) * 0.08);

      return {
        id: `digital_agitation_spike_${w.start}`,
        userId: baseline.userId,
        insightType: "digital_agitation_spike",
        title: "Digital agitation spike",
        sentence: generateInsightSentence("digital_agitation_spike", { time: timeLabel(w.start) }, confidence),
        confidence,
        severity: confidence > 0.82 ? "high" : "medium",
        start: w.start,
        end: w.end,
        evidence: [
          { signal: "app_switch_count", observed: w.appSwitchCount, baseline: baseline.appSwitchesPer20Min.toFixed(1), weight: 0.5 },
          { signal: "unlock_count", observed: w.unlockCount, baseline: baseline.unlocksPer20Min.toFixed(1), weight: 0.35 },
          { signal: "notification_opens", observed: w.notificationOpenCount, weight: 0.15 },
        ],
      } satisfies InsightCandidate;
    });
}
