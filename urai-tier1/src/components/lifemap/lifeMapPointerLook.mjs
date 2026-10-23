// Drag-to-look for the existing Life Map overview camera. This intentionally
// changes only orientation: star selection, camera travel and private replay
// authority remain with the original scene and selection handlers.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function lifeMapApplyPointerLook(orientation, deltaX, deltaY) {
  if (!orientation || ![orientation.yaw, orientation.pitch, deltaX, deltaY].every(Number.isFinite)) {
    throw new Error('LIFE_MAP_NONFINITE_POINTER_LOOK');
  }
  // Bounded per-event displacement prevents a dropped frame, stale pointer
  // capture or abrupt touchscreen event from causing a camera spin.
  const dx = clamp(deltaX, -120, 120);
  if (deltaX === 0 && deltaY === 0) return { yaw: orientation.yaw, pitch: orientation.pitch };
  const dy = clamp(deltaY, -120, 120);
  const yaw = orientation.yaw + dx * 0.004;
  return {
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    pitch: clamp(orientation.pitch - dy * 0.003, -0.95, 0.95),
  };
}
