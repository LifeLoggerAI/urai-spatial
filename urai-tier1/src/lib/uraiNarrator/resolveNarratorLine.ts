import type { EmotionalState, Phase } from "@/lib/uraiEmotion/types";
import type { UraiMemoryEvent } from "@/lib/uraiMemory/types";
import type { PatternInsight } from "@/lib/uraiPatterns/types";
import type { AgentSuggestion } from "@/lib/uraiAgent/types";
import type { NarratorLine, NarratorPerspective, NarratorTone } from "./types";

export function resolveNarratorLine(input: {
  phase: Phase;
  selectedMemory?: Partial<UraiMemoryEvent> | null;
  emotionalState: EmotionalState;
  activePatterns?: PatternInsight[];
  agentSuggestion?: AgentSuggestion | null;
  now?: number;
}): NarratorLine | null {
  const now = input.now ?? Date.now();

  if (input.agentSuggestion && input.agentSuggestion.priority === "high") {
    return makeLine(input.agentSuggestion.text, "protective", "companion", input.phase, 90, "agent", now);
  }

  const shadow = (input.activePatterns ?? []).find((p) => p.category === "shadow" && p.severity > 0.65);

  if (shadow && input.phase === "REPLAY") {
    return makeLine(`This moment carries a repeating pattern: ${shadow.label}.`, "reflective", "witness", input.phase, 80, "shadow", now);
  }

  if (input.selectedMemory && input.phase === "FOCUS") {
    return makeLine(resolveFocusMeaning(input.selectedMemory, input.emotionalState), resolveTone(input.emotionalState), "companion", input.phase, 60, "memory", now);
  }

  if (input.selectedMemory && input.phase === "REPLAY") {
    return makeLine(resolveReplayMeaning(input.selectedMemory, input.emotionalState), resolveTone(input.emotionalState), "witness", input.phase, 75, "memory", now);
  }

  if (input.phase === "LIFEMAP") {
    return makeLine("Your memories are arranging themselves by weight, rhythm, and emotional gravity.", "analytical", "companion", input.phase, 40, "phase", now);
  }

  return null;
}

function makeLine(
  text: string,
  tone: NarratorTone,
  perspective: NarratorPerspective,
  phase: Phase,
  priority: number,
  source: NarratorLine["source"],
  now: number
): NarratorLine {
  return {
    id: `${source}_${phase}_${now}`,
    text,
    tone,
    perspective,
    phase,
    priority,
    createdAt: now,
    speakAfterMs: phase === "REPLAY" ? 900 : phase === "FOCUS" ? 650 : phase === "ASCENT" ? 800 : 1000,
    minVisibleMs: 2400,
    canSpeak: true,
    source,
  };
}

function resolveTone(emotion: EmotionalState): NarratorTone {
  if (emotion.primary === "grief" || emotion.primary === "loneliness") return "somber";
  if (emotion.primary === "overload" || emotion.primary === "fear") return "protective";
  if (emotion.primary === "focus") return "analytical";
  if (emotion.primary === "hope" || emotion.primary === "joy") return "encouraging";
  if (emotion.primary === "awe") return "awe";
  return "reflective";
}

function resolveFocusMeaning(memory: Partial<UraiMemoryEvent>, emotion: EmotionalState): string {
  const title = memory.title ?? "this memory";
  return `${title} is carrying ${emotion.primary} with weight ${emotion.symbolicWeight.toFixed(2)}.`;
}

function resolveReplayMeaning(memory: Partial<UraiMemoryEvent>, emotion: EmotionalState): string {
  const title = memory.title ?? "this moment";
  return `Replay is holding ${title} as a place, not just a memory.`;
}
