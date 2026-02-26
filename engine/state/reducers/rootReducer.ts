
import { SpatialState, Action } from "../types";
import { systemReducer } from "./systemReducer";
import { identityReducer } from "./identityReducer";
import { sceneReducer } from "./sceneReducer";
import { cameraReducer } from "./cameraReducer";
import { emotionReducer } from "./emotionReducer";
import { replayReducer } from "./replayReducer";

export function rootReducer(state: SpatialState, action: Action): SpatialState {
  return {
    system: systemReducer(state.system, action),
    identity: identityReducer(state.identity, action),
    scene: sceneReducer(state.scene, action),
    camera: cameraReducer(state.camera, action),
    emotion: emotionReducer(state.emotion, action),
    replay: replayReducer(state.replay, action),
  };
}
