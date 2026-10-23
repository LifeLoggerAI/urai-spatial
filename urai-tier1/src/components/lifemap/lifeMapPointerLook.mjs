// Drag-to-look for the existing Life Map overview camera. This intentionally
// changes only orientation: star selection, camera travel and private replay
// authority remain with the original scene and selection handlers.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const LIFE_MAP_POINTER_DRAG_THRESHOLD_PX = 8;

export function lifeMapPointerDragStep(gesture, x, y) {
  if (!gesture || typeof gesture.dragging !== 'boolean' ||
      ![gesture.startX, gesture.startY, gesture.lastX, gesture.lastY, x, y].every(Number.isFinite)) {
    throw new Error('LIFE_MAP_NONFINITE_POINTER_DRAG');
  }
  if (gesture.dragging) {
    return { dragging: true, deltaX: x - gesture.lastX, deltaY: y - gesture.lastY };
  }
  const totalX = x - gesture.startX;
  const totalY = y - gesture.startY;
  const distance = Math.hypot(totalX, totalY);
  if (!Number.isFinite(distance)) throw new Error('LIFE_MAP_NONFINITE_POINTER_DRAG');
  if (distance < LIFE_MAP_POINTER_DRAG_THRESHOLD_PX) {
    return { dragging: false, deltaX: 0, deltaY: 0 };
  }
  // Consume the dead zone before moving the camera. A first drag frame
  // can no longer rotate by the entire 8px threshold at once.
  const fraction = distance === 0 ? 0 :
    (distance - LIFE_MAP_POINTER_DRAG_THRESHOLD_PX) / distance;
  return { dragging: true, deltaX: totalX * fraction, deltaY: totalY * fraction };
}


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
