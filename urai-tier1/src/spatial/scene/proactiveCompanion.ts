import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";
import { createNarratorInsight, type NarratorInsight, type NarratorSignal } from "./companionNarrator";

export type ProactiveCompanionContext = {
  mode: LifeMapMode;
  selectedNode: LifeMapNode | null;
  visibleNodes: LifeMapNode[];
  phase: string;
  lastSpokenAt: number;
  now?: number;
};

const MIN_PROACTIVE_GAP_MS = 45000;

function strongestNode(nodes: LifeMapNode[]) {
  return [...nodes].sort((a, b) => {
    const aWeight = a.importanceScore + (a.isShadow ? 18 : 0) + (a.isRecovery ? 14 : 0) + (a.isDream ? 8 : 0);
    const bWeight = b.importanceScore + (b.isShadow ? 18 : 0) + (b.isRecovery ? 14 : 0) + (b.isDream ? 8 : 0);
    return bWeight - aWeight;
  })[0] ?? null;
}

export function createProactiveCompanionInsight(context: ProactiveCompanionContext): NarratorInsight | null {
  const now = context.now ?? Date.now();
  if (context.phase === "home" || context.phase === "ascent") return null;
  if (now - context.lastSpokenAt < MIN_PROACTIVE_GAP_MS) return null;

  const node = context.selectedNode ?? strongestNode(context.visibleNodes);
  if (!node && context.visibleNodes.length === 0) return null;

  const type: NarratorSignal["type"] =
    context.mode === "shadow"
      ? "shadow"
      : context.mode === "recovery"
        ? "recovery"
        : context.mode === "dream"
          ? "dream"
          : context.mode === "relationship"
            ? "relationship"
            : context.mode === "mirror"
              ? "mirror"
              : node
                ? "star-glow"
                : "ambient";

  const insight = createNarratorInsight({
    type,
    mode: context.mode,
    selectedNode: node,
  });

  return {
    ...insight,
    id: `proactive-${now}`,
    priority: Math.max(insight.priority, node?.isShadow ? 9 : node?.isRecovery ? 8 : 6),
    speak: insight.priority >= 6,
  };
}

export function emitProactiveCompanionInsight(insight: NarratorInsight, node: LifeMapNode | null, mode: LifeMapMode) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("urai:companion.proactive", {
      detail: {
        insight,
        mode,
        starId: node?.id ?? null,
        chapterId: node?.chapterId ?? null,
        timestamp: Date.now(),
      },
    })
  );
}
