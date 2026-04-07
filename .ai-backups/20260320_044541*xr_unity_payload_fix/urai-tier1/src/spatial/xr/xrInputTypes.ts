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
  jointsTracked: number;
  trackingState: "idle" | "tracked";
};

export type XrInputSnapshot = {
  controllers: Record<XrHandSide, XrControllerState>;
  hands: Record<XrHandSide, XrHandState>;
  handedness?: string | null;
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
        jointsTracked: 0,
        trackingState: "idle",
      },
      right: {
        connected: false,
        jointsTracked: 0,
        trackingState: "idle",
      },
    },
  };
}
