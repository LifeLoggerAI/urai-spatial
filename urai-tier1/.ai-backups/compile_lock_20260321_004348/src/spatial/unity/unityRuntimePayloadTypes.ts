import type { UnityRuntimePayloadInput } from "./buildUnityRuntimePayload";

export type UnityRuntimePayload = ReturnType<typeof import("./buildUnityRuntimePayload").buildUnityRuntimePayload>;

export const unityRuntimePayloadSample: UnityRuntimePayloadInput = {
  mode: "home",
  selectedStar: null,
  presenting: false,
  hasHeadsetPose: false,
  xrInput: {
    controllers: {
      left: {
        connected: false,
        profile: null,
        selecting: false,
        squeezing: false,
        hasGamepad: false,
      },
      right: {
        connected: false,
        profile: null,
        selecting: false,
        squeezing: false,
        hasGamepad: false,
      },
    },
    hands: {
      left: {
        connected: false,
        tracking: false,
        pinching: false,
        jointsTracked: 0,
        trackingState: "idle",
      },
      right: {
        connected: false,
        tracking: false,
        pinching: false,
        jointsTracked: 0,
        trackingState: "idle",
      },
    },
    handedness: null,
    trackingState: "idle",
    pointerActive: false,
    squeezeActive: false,
    selectActive: false,
  },
  arPlacement: {
    enabled: false,
    placed: false,
    planeTracked: false,
    anchors: 0,
    visible: false,
    x: 0,
    y: 0,
    z: 0,
    qx: 0,
    qy: 0,
    qz: 0,
    qw: 1,
  },
  locomotion: {
    active: false,
    mode: "none",
    speed: 0,
    turnStyle: "snap",
    userX: 0,
    userY: 0,
    userZ: 0,
    moveX: 0,
    moveY: 0,
    moveZ: 0,
    turnDelta: 0,
  },
  starCount: 42,
};

export default unityRuntimePayloadSample;
