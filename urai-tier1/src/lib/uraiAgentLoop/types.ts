export type UraiAgentPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
export type UraiAgentIntent = "observe" | "wait" | "suggest_focus" | "suggest_replay" | "suggest_reflection" | "suggest_export" | "slow_down";

export type UraiAgentPlan = {
  id: string;
  intent: UraiAgentIntent;
  priority: number;
  reason: string;
  suggestedMemoryId: string | null;
  safeToAutoExecute: false;
  createdAt: number;
};

export type UraiAgentLoopState = {
  version: 1;
  mode: "passive";
  phase: UraiAgentPhase;
  plan: UraiAgentPlan;
  verification: {
    canonicalSafe: boolean;
    blockedReason: string | null;
    checkedAt: number;
  };
  narratorLine: string;
  updatedAt: number;
};
