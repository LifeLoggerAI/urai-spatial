
import { SpatialState, Action } from "../types";

const initialState: SpatialState['camera'] = {
  presetId: "home-idle",
  locked: false,
};

export function cameraReducer(
  state: SpatialState['camera'] = initialState,
  action: Action
): SpatialState['camera'] {
  switch (action.type) {
    case "CAMERA_PRESET_SET":
      return {
        ...state,
        presetId: action.payload,
        locked: true,
      };

    case "CAMERA_UNLOCK":
      return {
        ...state,
        locked: false,
      };

    default:
      return state;
  }
}
