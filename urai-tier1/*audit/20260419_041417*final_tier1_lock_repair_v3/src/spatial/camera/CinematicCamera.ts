import * as THREE from "three";

export function easeInOutCubic(t: number) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerpVec(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return a.clone().lerp(b, t);
}

export function arcLerp(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y += Math.abs(a.distanceTo(b)) * 0.2;
  const ab = lerpVec(a, mid, t);
  const bc = lerpVec(mid, b, t);
  return lerpVec(ab, bc, t);
}
