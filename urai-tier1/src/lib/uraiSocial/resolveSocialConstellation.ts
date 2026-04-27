import type { UraiSocialConstellation, UraiSocialEdge, UraiSocialNode } from "./types";

export function createDemoSocialNodes(now: number): UraiSocialNode[] {
  return [
    {
      id: "self",
      label: "Self",
      role: "self",
      tone: "neutral",
      weight: 0.86,
      trustSignal: 0.76,
      recurrence: 1,
      lastInteractionAt: now,
      position: [0, 0.4, -4.8],
    },
    {
      id: "anchor",
      label: "Anchor Signal",
      role: "anchor",
      tone: "supportive",
      weight: 0.72,
      trustSignal: 0.84,
      recurrence: 0.78,
      lastInteractionAt: now - 1000 * 60 * 60 * 18,
      position: [-2.8, 1.1, -5.8],
    },
    {
      id: "mirror",
      label: "Mirror Signal",
      role: "mirror",
      tone: "warm",
      weight: 0.62,
      trustSignal: 0.68,
      recurrence: 0.56,
      lastInteractionAt: now - 1000 * 60 * 60 * 44,
      position: [2.6, 0.9, -6.4],
    },
    {
      id: "challenger",
      label: "Charged Signal",
      role: "challenger",
      tone: "charged",
      weight: 0.78,
      trustSignal: 0.42,
      recurrence: 0.64,
      lastInteractionAt: now - 1000 * 60 * 60 * 82,
      position: [0.9, -1.2, -7.2],
    },
    {
      id: "ghost",
      label: "Absence Signal",
      role: "ghost",
      tone: "distant",
      weight: 0.58,
      trustSignal: 0.24,
      recurrence: 0.32,
      lastInteractionAt: now - 1000 * 60 * 60 * 240,
      position: [-1.8, -1.5, -7.8],
    },
  ];
}

export function resolveSocialConstellation(now: number): UraiSocialConstellation {
  const nodes = createDemoSocialNodes(now);

  const edges: UraiSocialEdge[] = [
    {
      id: "self-anchor",
      fromId: "self",
      toId: "anchor",
      strength: 0.76,
      tone: "supportive",
      pattern: "stable",
    },
    {
      id: "self-mirror",
      fromId: "self",
      toId: "mirror",
      strength: 0.58,
      tone: "warm",
      pattern: "emerging",
    },
    {
      id: "self-challenger",
      fromId: "self",
      toId: "challenger",
      strength: 0.68,
      tone: "charged",
      pattern: "strained",
    },
    {
      id: "self-ghost",
      fromId: "self",
      toId: "ghost",
      strength: 0.38,
      tone: "distant",
      pattern: "fading",
    },
  ];

  const charged = nodes.filter((node) => node.tone === "charged" || node.role === "challenger").length;
  const support = nodes.filter((node) => node.tone === "supportive" || node.role === "anchor").length;
  const absence = nodes.filter((node) => node.role === "ghost" || node.tone === "distant").length;

  const dominantSocialPattern =
    charged >= 1 ? "charged_relation" :
    support >= 2 ? "stable_support" :
    absence >= 1 ? "absence_pattern" :
    "mixed_social_field";

  const suggested =
    nodes
      .filter((node) => node.id !== "self")
      .sort((a, b) => {
        const aScore = a.weight * 0.44 + (1 - a.trustSignal) * 0.32 + a.recurrence * 0.24;
        const bScore = b.weight * 0.44 + (1 - b.trustSignal) * 0.32 + b.recurrence * 0.24;
        return bScore - aScore;
      })[0] ?? null;

  const systemInsight =
    dominantSocialPattern === "charged_relation"
      ? "URAI is detecting a charged social constellation. One relationship signal has high emotional weight and reduced trust stability."
      : dominantSocialPattern === "stable_support"
        ? "URAI is detecting a support constellation. Anchor signals are stabilizing the field."
        : dominantSocialPattern === "absence_pattern"
          ? "URAI is detecting an absence pattern. Social distance is becoming part of the memory field."
          : "URAI is detecting a mixed social field. No single relationship pattern dominates yet.";

  return {
    version: 1,
    nodes,
    edges,
    dominantSocialPattern,
    systemInsight,
    suggestedSocialFocusId: suggested?.id ?? null,
    updatedAt: now,
  };
}
