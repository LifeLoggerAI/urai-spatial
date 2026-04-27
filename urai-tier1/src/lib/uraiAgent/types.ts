export interface CompanionPersona {
  name: string;
  warmth: number;
  directness: number;
  analyticalDepth: number;
  humor: number;
  protectiveness: number;
  silencePreference: number;
  symbolicLanguage: number;
  updatedAt: number;
}

export interface AgentState {
  userId?: string;
  mode: "observe" | "reflect" | "suggest" | "protect" | "silent";
  trustLevel: number;
  intrusivenessBudget: number;
  lastInterventionAt?: number;
  activeGoalIds: string[];
  activePatternIds: string[];
  companionPersona: CompanionPersona;
}

export interface AgentSuggestion {
  id: string;
  userId?: string;
  type: "reflection" | "nudge" | "suggestion" | "stabilization" | "silence";
  text: string;
  priority: "low" | "medium" | "high";
  reason: string;
  patternIds: string[];
  memoryIds: string[];
  createdAt: number;
  expiresAt: number;
  deliverySurface: "narrator" | "notification" | "timeline" | "constellation";
}
