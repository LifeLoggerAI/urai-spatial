
import { SpatialState, Action } from "../types";

const initialState: SpatialState['replay'] = {
  progress: 0,
};

export function replayReducer(
  state: SpatialState['replay'] = initialState,
  action: Action
): SpatialState['replay'] {
  switch (action.type) {
    case "REPLAY_START":
      return {
        ...state,
        activeReplayId: action.payload.replayId,
        starId: action.payload.starId,
        immutableHash: action.payload.hash,
        progress: 0,
      };

    case "REPLAY_PROGRESS_SET":
      return {
        ...state,
        progress: action.payload,
      };

    case "REPLAY_END":
      return {
        ...initialState,
      };

    default:
      return state;
  }
}
