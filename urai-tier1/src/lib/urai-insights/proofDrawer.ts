import type { InsightCandidate, ProofDrawer } from "./types";

function impact(weight: number): "low" | "medium" | "high" {
  if (weight >= 0.4) return "high";
  if (weight >= 0.2) return "medium";
  return "low";
}

export function buildProofDrawer(candidate: InsightCandidate): ProofDrawer {
  return {
    insightId: candidate.id,
    why: "URAI detected a measurable shift compared with your normal rhythm.",
    signalsUsed: candidate.evidence.map(e => e.signal),
    timeRange: { start: candidate.start, end: candidate.end },
    confidence: candidate.confidence,
    evidence: candidate.evidence.map(e => ({
      label: e.signal.replaceAll("_", " "),
      observed: String(e.observed),
      baseline: e.baseline === undefined ? undefined : String(e.baseline),
      impact: impact(e.weight),
    })),
    privacy: {
      processed: "local",
      usedContactIdentity: Boolean(candidate.relatedContactId),
      storedRawAudio: false,
    },
  };
}
