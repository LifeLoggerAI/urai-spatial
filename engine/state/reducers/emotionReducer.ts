
import { SpatialState, Action, EmotionType } from "../types";

const initialState: SpatialState['emotion'] = {
  primary: "calm",
  intensity: 0,
};

export function emotionReducer(
  state: SpatialState['emotion'] = initialState,
  action: Action
): SpatialState['emotion'] {
  switch (action.type) {
    case "EMOTION_SET":
      return {
        primary: action.payload.primary as EmotionType,
        intensity: action.payload.intensity,
      };

    default:
      return state;
  }
}
