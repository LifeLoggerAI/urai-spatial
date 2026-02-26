
import { SpatialState, Action } from "../types";

const initialState: SpatialState['identity'] = {
  userId: "",
  sessionId: "",
  identityHash: "",
};

export function identityReducer(
  state: SpatialState['identity'] = initialState,
  action: Action
): SpatialState['identity'] {
  switch (action.type) {
    case "IDENTITY_SET":
      return {
        ...state,
        userId: action.payload.userId || state.userId,
        sessionId: action.payload.sessionId || state.sessionId,
        identityHash: action.payload.identityHash || state.identityHash,
      };

    default:
      return state;
  }
}
