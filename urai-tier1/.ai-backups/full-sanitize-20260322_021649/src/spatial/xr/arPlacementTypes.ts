export type ArPlacementPose = {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  hasPlane: boolean;
};

export function createEmptyArPlacementPose(): ArPlacementPose {
  return {
    visible: false,
    x: 0,
    y: 0,
    z: 0,
    qx: 0,
    qy: 0,
    qz: 0,
    qw: 1,
    hasPlane: false,
  };
}
