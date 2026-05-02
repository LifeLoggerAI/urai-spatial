import type { InsightCandidate } from "./types";

export type SuppressionContext = {
  trustScore: number;
  alreadyShownToday?: number;
  hiddenTypes?: string[];
  recentlyShownTypes?: Record<string, number>;
  now?: number;
};

const RULES = {
  minConfidence: 0.65,
  maxShownPerDay: 1,
  blockRepeatedTypeWithinHours: 48,
  blockPersonInsightsUntilTrustScore: 0.75,
};

export function applySuppressionRules(
  candidates: InsightCandidate[],
  context: SuppressionContext = { trustScore: 0.25 }
): InsightCandidate[] {
  const now = context.now ?? Date.now();

  const allowed = candidates
    .map(c => {
      if (c.confidence < RULES.minConfidence) return { ...c, suppressionReason: "confidence_below_threshold" };
      if ((context.alreadyShownToday ?? 0) >= RULES.maxShownPerDay) return { ...c, suppressionReason: "daily_limit_reached" };
      if (context.hiddenTypes?.includes(c.insightType)) return { ...c, suppressionReason: "user_hidden_type" };

      const lastShown = context.recentlyShownTypes?.[c.insightType];
      if (lastShown && now - lastShown < RULES.blockRepeatedTypeWithinHours * 3600000) {
        return { ...c, suppressionReason: "cooldown_active" };
      }

      if (c.relatedContactId && context.trustScore < RULES.blockPersonInsightsUntilTrustScore) {
        if (c.insightType === "social_drain_pattern") return { ...c, suppressionReason: "person_insight_trust_ramp" };
      }

      return c;
    })
    .filter(c => !c.suppressionReason)
    .sort((a, b) => b.confidence - a.confidence);

  return allowed.slice(0, RULES.maxShownPerDay);
}
