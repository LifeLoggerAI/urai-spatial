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

