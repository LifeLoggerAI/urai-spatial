export type XrHandSide = "left" | "right";

export type XrControllerState = {
  connected: boolean;
  profile: string | null;
  selecting: boolean;
  squeezing: boolean;
  hasGamepad: boolean;
};

export type XrHandState = {
  connected: boolean;
  tracking: boolean;
  pinching: boolean;
  jointsTracked: number;
  trackingState: "idle" | "tracked";
};

export type XrInputSnapshot = {
  controllers: {
    left: XrControllerState;
    right: XrControllerState;
  };
  hands: Record<XrHandSide, XrHandState>;
  handedness: string | null;
  trackingState: "idle" | "tracking" | "lost";
  pointerActive: boolean;
  squeezeActive: boolean;
  selectActive: boolean;
};

export function createEmptyXrInputSnapshot(): XrInputSnapshot {
  return {
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
  };
}

export default createEmptyXrInputSnapshot;
