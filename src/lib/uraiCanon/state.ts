import type { StarNode, UraiRuntimeState, UraiPhase } from "./types";
import { assertLegalTransition, assertReplaySelectionIntegrity, assertValidStarNode } from "./validators";
import { getTransitionSpec } from "./transitions";

export const initialUraiState: UraiRuntimeState = {
  phase: "HOME",
  transition: "HOME_SETTLE",
  selectedStarId: null,
  inputLocked: true,
  hoverStarId: null,
  replayMemoryRef: null,
  lastStablePhase: "HOME",
};

export type UraiAction =
  | { type: "HOME_SETTLED" }
  | { type: "ASCEND_TO_LIFEMAP" }
  | { type: "DESCEND_TO_HOME" }
  | { type: "HOVER_STAR"; starId: string | null }
  | { type: "SELECT_STAR"; star: StarNode }
  | { type: "ENTER_REPLAY"; memoryRef: string }
  | { type: "EXIT_REPLAY" }
  | { type: "EXIT_FOCUS" }
  | { type: "TRANSITION_COMPLETE" };

export function uraiReducer(state: UraiRuntimeState, action: UraiAction): UraiRuntimeState {
  switch (action.type) {
    case "HOME_SETTLED":
      return { ...state, transition: "IDLE", inputLocked: false, lastStablePhase: "HOME" };

    case "ASCEND_TO_LIFEMAP": {
      assertLegalTransition("HOME", "LIFEMAP");
      const spec = getTransitionSpec("HOME", "LIFEMAP");
      return {
        ...state,
        phase: "LIFEMAP",
        transition: spec.state,
        inputLocked: spec.lockInput,
        selectedStarId: null,
        hoverStarId: null,
        replayMemoryRef: null,
      };
    }

    case "DESCEND_TO_HOME": {
      assertLegalTransition("LIFEMAP", "HOME");
      const spec = getTransitionSpec("LIFEMAP", "HOME");
      return {
        ...state,
        phase: "HOME",
        transition: spec.state,
        inputLocked: spec.lockInput,
        selectedStarId: null,
        hoverStarId: null,
        replayMemoryRef: null,
      };
    }

    case "HOVER_STAR":
      if (state.phase !== "LIFEMAP" || state.inputLocked) return state;
      return { ...state, hoverStarId: action.starId };

    case "SELECT_STAR": {
      if (state.phase !== "LIFEMAP" || state.inputLocked) return state;
      const star = assertValidStarNode(action.star);
      const spec = getTransitionSpec("LIFEMAP", "FOCUS");
      return {
        ...state,
        phase: "FOCUS",
        transition: spec.state,
        inputLocked: spec.lockInput,
        selectedStarId: star.id,
        replayMemoryRef: null,
      };
    }

    case "ENTER_REPLAY": {
      if (state.phase !== "FOCUS" || state.inputLocked || !state.selectedStarId) return state;
      const spec = getTransitionSpec("FOCUS", "REPLAY");
      const next = {
        ...state,
        phase: "REPLAY" as UraiPhase,
        transition: spec.state,
        inputLocked: spec.lockInput,
        replayMemoryRef: action.memoryRef,
      };
      assertReplaySelectionIntegrity(next);
      return next;
    }

    case "EXIT_REPLAY": {
      if (state.phase !== "REPLAY") return state;
      const spec = getTransitionSpec("REPLAY", "FOCUS");
      return {
        ...state,
        phase: "FOCUS",
        transition: spec.state,
        inputLocked: spec.lockInput,
      };
    }

    case "EXIT_FOCUS": {
      if (state.phase !== "FOCUS" || state.inputLocked) return state;
      const spec = getTransitionSpec("FOCUS", "LIFEMAP");
      return {
        ...state,
        phase: "LIFEMAP",
        transition: spec.state,
        inputLocked: spec.lockInput,
        replayMemoryRef: null,
      };
    }

    case "TRANSITION_COMPLETE":
      return {
        ...state,
        transition: "IDLE",
        inputLocked: false,
        lastStablePhase: state.phase === "REPLAY" ? "FOCUS" : state.phase,
      };

    default:
      return state;
  }
}
