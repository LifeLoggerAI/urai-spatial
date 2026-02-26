
import { SpatialState, Action, SpatialTransitionState } from "../types";

const initialState: SpatialState['scene'] = {
  active: "home",
  transitionState: SpatialTransitionState.IDLE,
};

export function sceneReducer(
  state: SpatialState['scene'] = initialState,
  action: Action
): SpatialState['scene'] {
  switch (action.type) {
    case "SCENE_SET_ACTIVE":
      if (["home", "lifemap", "replay"].includes(action.payload)) {
        return {
          ...state,
          active: action.payload,
        };
      }
      return state;

    case "SCENE_SET_TRANSITION_STATE":
      if (Object.values(SpatialTransitionState).includes(action.payload)) {
        return {
          ...state,
          transitionState: action.payload,
        };
      }
      return state;

    default:
      return state;
  }
}
