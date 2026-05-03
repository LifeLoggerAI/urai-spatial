import * as THREE from "three";

export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  return a.clone().lerp(b, t);
}

export function bezier3(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const ab = lerpVec3(a, b, t);
  const bc = lerpVec3(b, c, t);
  return lerpVec3(ab, bc, t);
}

export function makeArcControlPoint(
  from: THREE.Vector3,
  to: THREE.Vector3,
  mode: "up" | "down" | "forward" | "soft",
): THREE.Vector3 {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const dist = from.distanceTo(to);

  if (mode === "up") {
    mid.y += Math.max(1.5, dist * 0.22);
    mid.z += dist * 0.08;
  } else if (mode === "down") {
    mid.y -= Math.max(1.0, dist * 0.14);
    mid.z -= dist * 0.04;
  } else if (mode === "forward") {
    mid.y += Math.max(0.6, dist * 0.08);
  } else {
    mid.y += Math.max(0.35, dist * 0.04);
  }

  return mid;
}
