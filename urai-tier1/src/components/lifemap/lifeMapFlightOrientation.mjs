// Bounded overview look and camera-relative flight. Physical stars and all
// authenticated route decisions remain owned by the existing Life Map scene.
const bounded = (value, low, high) => Math.max(low, Math.min(high, value));
const finite3 = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);

export function lifeMapRotateFlightAxes(axes, yaw) {
  if (!axes || ![axes.x, axes.y, axes.z, yaw].every(Number.isFinite)) {
    throw new Error('LIFE_MAP_NONFINITE_FLIGHT_INPUT');
  }
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return {
    x: axes.x * cosine - axes.z * sine,
    y: axes.y,
    z: axes.x * sine + axes.z * cosine,
  };
}

export function advanceLifeMapViewOrientation(orientation, held, seconds) {
  if (!orientation || !Number.isFinite(orientation.yaw) || !Number.isFinite(orientation.pitch)) {
    throw new Error('LIFE_MAP_NONFINITE_ORIENTATION');
  }
  const dt = Number.isFinite(seconds) ? bounded(seconds, 0, 0.05) : 0;
  const turn = Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft'));
  const tilt = Number(held.has('ArrowUp')) - Number(held.has('ArrowDown'));
  const rawYaw = orientation.yaw + turn * dt * 1.35;
  return {
    yaw: Math.atan2(Math.sin(rawYaw), Math.cos(rawYaw)),
    pitch: bounded(orientation.pitch + tilt * dt * 1.05, -0.95, 0.95),
  };
}

export function lifeMapRotatedLookTarget(camera, target, orientation) {
  if (!finite3(camera) || !finite3(target) || !orientation ||
      !Number.isFinite(orientation.yaw) || !Number.isFinite(orientation.pitch)) {
    throw new Error('LIFE_MAP_NONFINITE_LOOK_TARGET');
  }
  if (orientation.yaw === 0 && orientation.pitch === 0) return target.slice();
  const [dx, dy, dz] = target.map((value, index) => value - camera[index]);
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-6) return target.slice();
  const yaw = Math.atan2(dx, -dz) + orientation.yaw;
  const pitch = bounded(Math.atan2(dy, Math.hypot(dx, dz)) + orientation.pitch, -1.18, 1.18);
  const horizontal = length * Math.cos(pitch);
  return [
    camera[0] + horizontal * Math.sin(yaw),
    camera[1] + length * Math.sin(pitch),
    camera[2] - horizontal * Math.cos(yaw),
  ];
}
