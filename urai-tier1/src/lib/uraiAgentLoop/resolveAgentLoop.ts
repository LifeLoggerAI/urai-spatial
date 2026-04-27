import type { UraiAgentLoopState, UraiAgentPhase, UraiAgentIntent } from "./types";

type Args = {
  phase: UraiAgentPhase;
  selectedMemoryId: string | null;
  memoryWeight: number;
  dominantArc: string;
  nextSuggestedFocusId: string | null;
  companionAction: string;
  companionWhisper: string;
  xrReady: boolean;
};

export function resolveUraiAgentLoop(args: Args): UraiAgentLoopState {
  const now = Date.now();

  let intent: UraiAgentIntent = "observe";
  let priority = 0.25;
  let reason = "The agent is observing without intervention.";
  let suggestedMemoryId: string | null = null;

  if (args.phase === "ASCENT") {
    intent = "wait";
    priority = 0.1;
    reason = "Canonical motion is active. Agent waits.";
  } else if (args.phase === "LIFEMAP" && args.nextSuggestedFocusId) {
    intent = "suggest_focus";
    priority = 0.68;
    reason = "Pattern layer has a deterministic next memory signal.";
    suggestedMemoryId = args.nextSuggestedFocusId;
  } else if (args.phase === "FOCUS" && args.memoryWeight >= 0.72) {
    intent = "suggest_replay";
    priority = 0.74;
    reason = "Focused memory has enough symbolic weight to justify replay.";
    suggestedMemoryId = args.selectedMemoryId;
  } else if (args.phase === "REPLAY" && (args.dominantArc === "shadow_loop" || args.companionAction === "slow_down")) {
    intent = "slow_down";
    priority = 0.82;
    reason = "Replay contains shadow pressure or slowdown signal.";
    suggestedMemoryId = args.selectedMemoryId;
  } else if (args.phase === "REPLAY") {
    intent = "suggest_export";
    priority = 0.56;
    reason = "Replay is structured enough to become a story export.";
    suggestedMemoryId = args.selectedMemoryId;
  } else if (args.phase === "HOME" && args.xrReady) {
    intent = "suggest_reflection";
    priority = 0.42;
    reason = "XR-ready anchors are available for reflection mode.";
  }

  const canonicalSafe =
    intent === "observe" ||
    intent === "wait" ||
    intent === "suggest_reflection" ||
    intent === "suggest_export" ||
    (intent === "suggest_focus" && args.phase === "LIFEMAP") ||
    (intent === "suggest_replay" && args.phase === "FOCUS") ||
    (intent === "slow_down" && args.phase === "REPLAY");

  const narratorLine =
    intent === "wait" ? "Agent is waiting while canonical motion completes." :
    intent === "suggest_focus" ? "Agent suggestion: enter the next strongest memory signal." :
    intent === "suggest_replay" ? "Agent suggestion: this focus is heavy enough to replay." :
    intent === "slow_down" ? "Agent suggestion: slow the replay and preserve the memory edge." :
    intent === "suggest_export" ? "Agent suggestion: this replay can become a story export." :
    intent === "suggest_reflection" ? "Agent suggestion: XR reflection mode is ready." :
    args.companionWhisper || "Agent is observing the field.";

  return {
    version: 1,
    mode: "passive",
    phase: args.phase,
    plan: {
      id: "urai-agent-plan-" + now,
      intent,
      priority,
      reason,
      suggestedMemoryId,
      safeToAutoExecute: false,
      createdAt: now,
    },
    verification: {
      canonicalSafe,
      blockedReason: canonicalSafe ? null : "Agent plan blocked by URAI canonical phase law.",
      checkedAt: now,
    },
    narratorLine,
    updatedAt: now,
  };
}
