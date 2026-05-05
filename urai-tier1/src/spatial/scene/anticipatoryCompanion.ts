import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";

export type AnticipatorySignal = {
  id: string;
  mode: LifeMapMode;
  starId: string | null;
  chapterId: string | null;
  intensity: "soft" | "medium" | "high";
  reason: "shadow-rising" | "recovery-near" | "dream-symbol" | "mirror-arc" | "important-star" | "ambient";
  prelude: string;
  shouldOpenCompanion: boolean;
  timestamp: number;
};

export type AnticipatoryContext = {
  mode: LifeMapMode;
  selectedNode: LifeMapNode | null;
  visibleNodes: LifeMapNode[];
  phase: string;
  lastSignalAt: number;
  now?: number;
};

const MIN_ANTICIPATORY_GAP_MS = 90000;

function strongestCandidate(nodes: LifeMapNode[]) {
  return [...nodes].sort((a, b) => {
    const aw = a.importanceScore + (a.isShadow ? 24 : 0) + (a.isRecovery ? 18 : 0) + (a.isDream ? 10 : 0);
    const bw = b.importanceScore + (b.isShadow ? 24 : 0) + (b.isRecovery ? 18 : 0) + (b.isDream ? 10 : 0);
    return bw - aw;
  })[0] ?? null;
}

export function createAnticipatorySignal(context: AnticipatoryContext): AnticipatorySignal | null {
  const now = context.now ?? Date.now();
  if (context.phase === "home" || context.phase === "ascent") return null;
  if (now - context.lastSignalAt < MIN_ANTICIPATORY_GAP_MS) return null;

  const node = context.selectedNode ?? strongestCandidate(context.visibleNodes);
  if (!node && context.visibleNodes.length === 0) return null;

  const reason: AnticipatorySignal["reason"] =
    context.mode === "shadow" || node?.isShadow
      ? "shadow-rising"
      : context.mode === "recovery" || node?.isRecovery
        ? "recovery-near"
        : context.mode === "dream" || node?.isDream
          ? "dream-symbol"
          : context.mode === "mirror"
            ? "mirror-arc"
            : node && node.importanceScore > 78
              ? "important-star"
              : "ambient";

  const intensity: AnticipatorySignal["intensity"] =
    reason === "shadow-rising" ? "high" : reason === "recovery-near" || reason === "mirror-arc" ? "medium" : "soft";

  const prelude =
    reason === "shadow-rising"
      ? "Something tender is surfacing. I can help you look gently."
      : reason === "recovery-near"
        ? "A recovery signal is brightening. There may be a rebound here."
        : reason === "dream-symbol"
          ? "A symbol is standing out. It may want translation before action."
          : reason === "mirror-arc"
            ? "The larger arc is becoming visible. Zoom out with me."
            : reason === "important-star"
              ? "One star is carrying more weight than the others."
              : "The sky shifted slightly. I am watching with you.";

  return {
    id: `anticipatory-${now}`,
    mode: context.mode,
    starId: node?.id ?? null,
    chapterId: node?.chapterId ?? null,
    intensity,
    reason,
    prelude,
    shouldOpenCompanion: intensity === "high",
    timestamp: now,
  };
}

export function emitAnticipatorySignal(signal: AnticipatorySignal) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("urai:companion.anticipatory", { detail: signal }));
}
