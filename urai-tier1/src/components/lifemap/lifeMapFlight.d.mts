export type LifeMapFlightPose = {
  position: number[];
  velocity: number[];
  yaw: number;
  pitch: number;
};

export type LifeMapFlightInput = {
  forward?: number;
  strafe?: number;
  vertical?: number;
  turn?: number;
  tilt?: number;
  lookX?: number;
  lookY?: number;
  sprint?: boolean;
  reducedMotion?: boolean;
};

export function advanceLifeMapFlight(pose: LifeMapFlightPose, input: LifeMapFlightInput, seconds: number): LifeMapFlightPose;
export function lifeMapFlightLookTarget(pose: LifeMapFlightPose): number[];
