export function lifeMapApplyPointerLook(
  orientation: { yaw: number; pitch: number },
  deltaX: number,
  deltaY: number,
): { yaw: number; pitch: number };

export const LIFE_MAP_POINTER_DRAG_THRESHOLD_PX: 8;
export function lifeMapPointerDragStep(
  gesture: {startX: number; startY: number; lastX: number; lastY: number; dragging: boolean},
  x: number,
  y: number,
): {dragging: boolean; deltaX: number; deltaY: number};
