export type XrLocomotionMode = "idle" | "smooth-stick";

export type XrLocomotionState = {
  active: boolean;
  mode: XrLocomotionMode;
  userX: number;
  userY: number;
  userZ: number;
  yaw: number;
  inputMoveX: number;
  inputMoveY: number;
  inputTurnX: number;
};

export function createEmptyXrLocomotionState(): XrLocomotionState {
  return {
    active: false,
    mode: "idle",
    userX: 0,
    userY: 0,
    userZ: 0,
    yaw: 0,
    inputMoveX: 0,
    inputMoveY: 0,
    inputTurnX: 0,
  };
}
