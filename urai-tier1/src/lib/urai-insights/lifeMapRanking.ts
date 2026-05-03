import type { InsightCandidate, InsightType } from "./types";

const STAR_MAP: Record<InsightType, string> = {
  post_call_energy_drop: "relationship_state_shift",
  digital_agitation_spike: "cognitive_load_spike",
  focus_burst: "focus_state",
  social_drain_pattern: "recurring_social_pattern",
  recovery_rebound: "recovery_event",
};

export function scoreLifeMapCandidate(candidate: InsightCandidate): number {
  const confidence = candidate.confidence;
  const novelty = candidate.insightType === "social_drain_pattern" ? 0.75 : 0.6;
  const recurrence = candidate.insightType === "social_drain_pattern" ? 0.9 : 0.45;
  const emotionalWeight = candidate.severity === "high" ? 0.9 : candidate.severity === "medium" ? 0.65 : 0.35;
  const userFeedbackWeight = 0.5;

  return Number((
    confidence * 0.35 +
    novelty * 0.2 +
    recurrence * 0.2 +
    emotionalWeight * 0.15 +
    userFeedbackWeight * 0.1
  ).toFixed(3));
}

export function rankForLifeMap(candidates: InsightCandidate[]): InsightCandidate[] {
  return candidates
    .map(c => ({ ...c, lifeMapScore: scoreLifeMapCandidate(c) }))
    .sort((a, b) => (b.lifeMapScore ?? 0) - (a.lifeMapScore ?? 0));
}

export function starTypeForInsight(type: InsightType): string {
  return STAR_MAP[type];
}

export function shouldSaveToLifeMap(candidate: InsightCandidate): boolean {
  return (candidate.lifeMapScore ?? scoreLifeMapCandidate(candidate)) >= 0.72;
}
