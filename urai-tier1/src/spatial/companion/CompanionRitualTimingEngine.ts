import type { CompanionContext, CompanionMemorySignal, CompanionState } from "./companionTypes";

export type RitualTimingKind = "anniversary" | "return" | "threshold" | "seasonal" | "quiet";

export type CompanionRitualMoment = {
  id: string;
  kind: RitualTimingKind;
  context: CompanionContext;
  title: string;
  line: string;
  symbolicCallback: string;
  silenceBeforeMs: number;
  silenceAfterMs: number;
  allowVoice: boolean;
  allowVisualBloom: boolean;
  ritualActionLabel: string;
};

export type CompanionRitualInput = {
  context: CompanionContext;
  state: CompanionState;
  memorySignals?: CompanionMemorySignal[];
  now?: Date;
  userLocalDate?: string;
  daysSinceLastRitual?: number;
};

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function isNearAnniversary(signal: CompanionMemorySignal, now: Date) {
  const then = new Date(signal.timestamp);
  if (!Number.isFinite(then.getTime())) return false;
  return Math.abs(dayOfYear(now) - dayOfYear(then)) <= 1 && then.getFullYear() !== now.getFullYear();
}

function strongestSignal(signals: CompanionMemorySignal[] = []) {
  return [...signals].sort((a, b) => b.intensity - a.intensity)[0] ?? null;
}

export function chooseRitualMoment(input: CompanionRitualInput): CompanionRitualMoment | null {
  const now = input.now ?? new Date();
  const daysSinceLastRitual = input.daysSinceLastRitual ?? 999;
  const signals = input.memorySignals ?? [];
  const anniversary = signals.find((signal) => isNearAnniversary(signal, now));
  const strongest = strongestSignal(signals);

  if (anniversary && daysSinceLastRitual >= 14) {
    return {
      id: `anniversary-${anniversary.id}`,
      kind: "anniversary",
      context: input.context,
      title: "Return Day",
      line: "A year has passed around this star. You are not standing in the same place.",
      symbolicCallback: anniversary.summary,
      silenceBeforeMs: 2400,
      silenceAfterMs: 1800,
      allowVoice: true,
      allowVisualBloom: true,
      ritualActionLabel: "Mark this return",
    };
  }

  if (strongest && strongest.intensity > 0.74 && daysSinceLastRitual >= 7) {
    return {
      id: `return-${strongest.id}`,
      kind: "return",
      context: input.context,
      title: "Return Moment",
      line: "This pattern came back, but you did not come back as the same person.",
      symbolicCallback: strongest.summary,
      silenceBeforeMs: 1900,
      silenceAfterMs: 1500,
      allowVoice: input.context !== "threshold",
      allowVisualBloom: true,
      ritualActionLabel: "Hold this pattern",
    };
  }

  if (input.context === "threshold" && daysSinceLastRitual >= 3) {
    return {
      id: "threshold-small-ritual",
      kind: "threshold",
      context: "threshold",
      title: "Small Map Ritual",
      line: "Only the next small light matters right now.",
      symbolicCallback: "small-map-in-fog",
      silenceBeforeMs: 2600,
      silenceAfterMs: 2200,
      allowVoice: false,
      allowVisualBloom: false,
      ritualActionLabel: "Keep the map small",
    };
  }

  return null;
}

export function applyRitualMomentLine(line: string, ritual: CompanionRitualMoment | null) {
  return ritual ? ritual.line : line;
}

export function rememberRitualMoment(state: CompanionState, ritual: CompanionRitualMoment | null): CompanionState {
  if (!ritual) return state;
  return {
    ...state,
    recentThemes: Array.from(new Set([ritual.kind, ritual.symbolicCallback, ...state.recentThemes])).slice(0, 14),
    activeCelebration: ritual.kind === "anniversary" || ritual.kind === "return" ? ritual.symbolicCallback : state.activeCelebration,
    activeConcern: ritual.kind === "threshold" ? ritual.symbolicCallback : state.activeConcern,
    updatedAt: new Date().toISOString(),
  };
}

export function sacredUXDisclosure() {
  return "Sacred mode is symbolic UX: ritual timing, silence, and memory callbacks. It does not imply supernatural meaning or certainty.";
}
