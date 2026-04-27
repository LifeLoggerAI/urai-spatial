export const uraiTier12AgentLoopFirestoreSchema = {
  users: {
    "{userId}": {
      uraiAgentLoop: {
        latest: {
          version: "1",
          mode: "passive",
          phase: "HOME | ASCENT | LIFEMAP | FOCUS | REPLAY",
          plan: {
            id: "string",
            intent: "observe | wait | suggest_focus | suggest_replay | suggest_reflection | suggest_export | slow_down",
            priority: "number",
            reason: "string",
            suggestedMemoryId: "string | null",
            safeToAutoExecute: "false",
            createdAt: "number",
          },
          verification: {
            canonicalSafe: "boolean",
            blockedReason: "string | null",
            checkedAt: "number",
          },
          narratorLine: "string",
          updatedAt: "number",
        },
      },
    },
  },
} as const;
