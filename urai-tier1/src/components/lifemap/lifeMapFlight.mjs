// Isolated pure motion kernel for the original private Life Map camera.

// These world-space bounds prevent uncontrolled travel into unloaded areas.

const clampLifeMap = function clampLifeMap(value,min,max) { return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0)); };

export function advanceLifeMapFlight(pose, input, seconds) {
  const dt = clampLifeMap(seconds, 0, 0.05);
  const yawUnwrapped = pose.yaw + clampLifeMap(input.lookX || 0, -0.35, 0.35) + clampLifeMap(input.turn || 0, -1, 1) * dt * 1.25;
  const yaw = Math.atan2(Math.sin(yawUnwrapped), Math.cos(yawUnwrapped));
  const pitch = clampLifeMap(pose.pitch + clampLifeMap(input.lookY || 0, -0.25, 0.25) + clampLifeMap(input.tilt || 0, -1, 1) * dt * 1.1, -1.18, 1.18);
  let strafe = clampLifeMap(input.strafe || 0, -1, 1);
  let forward = clampLifeMap(input.forward || 0, -1, 1);
  let vertical = clampLifeMap(input.vertical || 0, -1, 1);
  const magnitude = Math.hypot(strafe, forward, vertical);
  if (magnitude > 1) { strafe /= magnitude; forward /= magnitude; vertical /= magnitude; }
  const speed = input.sprint ? 10 : 5;
  const desired = [
    (Math.cos(yaw) * strafe + Math.sin(yaw) * forward) * speed,
    vertical * speed,
    (Math.sin(yaw) * strafe - Math.cos(yaw) * forward) * speed,
  ];
  const ease = input.reducedMotion ? 1 : 1 - Math.exp(-9 * dt);
  const velocity = pose.velocity.map((v, i) => v + (desired[i] - v) * ease);
  const limits = [[-36, 36], [-14, 20], [-54, 34]];
  const position = pose.position.map((p, i) => clampLifeMap(p + velocity[i] * dt, limits[i][0], limits[i][1]));
  for (let i = 0; i < position.length; i += 1) if (position[i] === limits[i][0] || position[i] === limits[i][1]) velocity[i] = 0;
  return { position, velocity, yaw, pitch };
}

export function lifeMapFlightLookTarget(pose) {
  return [
    pose.position[0] + Math.sin(pose.yaw) * Math.cos(pose.pitch),
    pose.position[1] + Math.sin(pose.pitch),
    pose.position[2] - Math.cos(pose.yaw) * Math.cos(pose.pitch),
  ];
}

/**
 * Camera journey waypoints live on a single forward trajectory. A bounded side/up
 * arc adds parallax without stepping backward between selected-star phases.
 * This is geometric motion only; memory authorization remains with the caller.
 */
export function lifeMapApproachWaypoints(from, target, standoff = 5.8) {
  const start = [0, 1.55, 13.4].map((fallback, i) =>
    Number.isFinite(from?.[i]) ? from[i] : fallback);
  const focus = [0, 0, -4.5].map((fallback, i) =>
    Number.isFinite(target?.[i]) ? target[i] : fallback);
  const delta = start.map((v, i) => v - focus[i]);
  const length = Math.hypot(...delta);
  const direction = length > 0.01 ? delta.map(v => v / length) : [0, 0, 1];
  const safeStandoff = clampLifeMap(standoff, 2, 10);
  // A nearby star must not push the viewer several units backward.
  // Retreat is allowed only when already inside the minimum safety clearance.
  const arrivalDistance = length >= safeStandoff ? safeStandoff :
    length > 0.85 ? Math.max(0.85, length * 0.8) : length;
  const lift = Math.min(0.34, Math.max(0, length - arrivalDistance) * 0.2);
  const arrival = focus.map((v, i) => v + direction[i] * arrivalDistance + (i === 1 ? lift : 0));
  // Already inside the visual threshold: stay in place rather than reverse out of the star.
  if (length <= 0.85) return { departure: start, travel: start.slice(), approach: start.slice(), arrival: start.slice(), target: focus };
  const span = Math.hypot(...arrival.map((v, i) => v - start[i]));
  const sideLength = Math.hypot(direction[2], direction[0]) || 1;
  const side = [-direction[2] / sideLength, 0, direction[0] / sideLength];
  const bend = Math.min(1, span * 0.1);
  const point = (fraction) => {
    const arc = Math.sin(fraction * Math.PI) * bend;
    return start.map((v, i) =>
      v + (arrival[i] - v) * fraction + side[i] * arc * 0.55 + (i === 1 ? arc * 0.45 : 0));
  };
  return {
    departure: start,
    travel: point(0.48),
    approach: point(0.82),
    arrival,
    target: focus,
  };
}
