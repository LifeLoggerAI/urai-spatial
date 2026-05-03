import { useMemo } from "react";
import { resolveUraiAgentLoop } from "@/lib/uraiAgentLoop/resolveAgentLoop";
import type { UraiAgentLoopState, UraiAgentPhase } from "@/lib/uraiAgentLoop/types";

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

export function useUraiAgentLoop(args: Args): UraiAgentLoopState {
  return useMemo(() => resolveUraiAgentLoop(args), [
    args.phase,
    args.selectedMemoryId,
    args.memoryWeight,
    args.dominantArc,
    args.nextSuggestedFocusId,
    args.companionAction,
    args.companionWhisper,
    args.xrReady,
  ]);
}
