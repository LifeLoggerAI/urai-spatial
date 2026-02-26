
import { SpatialState, Action } from "../types";

const initialState: SpatialState['system'] = {
  version: "v1.0.0-spatial",
  mode: "dev",
  deterministic: false,
};

export function systemReducer(
  state: SpatialState['system'] = initialState,
  action: Action
): SpatialState['system'] {
  switch (action.type) {
    case "SYSTEM_SET_MODE":
      if (["dev", "demo", "prod"].includes(action.payload)) {
        return {
          ...state,
          mode: action.payload,
        };
      }
      return state;

    case "SYSTEM_SET_DETERMINISTIC":
      return {
        ...state,
        deterministic: Boolean(action.payload),
      };

    default:
      return state;
  }
}
