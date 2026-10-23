// Physical Life Map exploration gesture ownership. This runs on the WebGL
// canvas but never grants permission to open a Memory Star or private Replay.
import { lifeMapPointerDragStep } from './lifeMapPointerLook.mjs';

export function installLifeMapPointerInteraction({ canvas, hostWindow, blocked, onLook }) {
  if (!canvas || !hostWindow || typeof blocked !== 'function' || typeof onLook !== 'function') {
    throw new Error('LIFE_MAP_POINTER_INTERACTION_CONFIG');
  }
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  let active = null;
  let suppressClick = false;

  const release = () => {
    const id = active?.id;
    active = null;
    if (id !== undefined) {
      try {
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      } catch { /* capture may have ended during disposal or route changes */ }
    }
  };
  const down = (event) => {
    if (active && active.id !== event.pointerId) {
      // A second finger must never turn a view drag into star activation.
      suppressClick = true;
      release();
      return;
    }
    if (event.isPrimary === false) {
      suppressClick = true;
      release();
      return;
    }
    if (active || event.button !== 0) return;
    if (blocked()) { suppressClick = true; return; }
    // A new primary gesture is the only opportunity to clear suppression from
    // a previous drag. It cannot retroactively authorize that drag's click.
    suppressClick = false;
    active = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY, dragging: false };
    // Do NOT capture ordinary taps. The existing R3F raycast keeps full
    // ownership of genuine Memory Star clicks.
  };
  const move = (event) => {
    if (!active || active.id !== event.pointerId) return;
    if (blocked()) {
      suppressClick = true;
      release();
      return;
    }
    const step = lifeMapPointerDragStep(active, event.clientX, event.clientY);
    if (!step.dragging) return;
    if (!active.dragging) {
      // Acquire capture only after the threshold, when interaction has
      // definitively become exploration and not a star click.
      try { canvas.setPointerCapture(event.pointerId); } catch { /* optional */ }
    }
    active.lastX = event.clientX;
    active.lastY = event.clientY;
    active.dragging = true;
    suppressClick = true;
    if (step.deltaX !== 0 || step.deltaY !== 0) onLook(step.deltaX, step.deltaY);
    if (event.cancelable) event.preventDefault();
  };
  const end = (event) => { if (active?.id === event.pointerId) release(); };
  const blur = () => {
    if (active?.dragging) suppressClick = true;
    release();
  };
  const clickCapture = (event) => {
    if (!suppressClick) return;
    // R3F's delta is only down-up displacement; a long drag returning to its
    // origin could otherwise pass the physical star's 6px click check.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('click', clickCapture, true);
  hostWindow.addEventListener('pointerup', end);
  hostWindow.addEventListener('pointercancel', end);
  hostWindow.addEventListener('blur', blur);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', end);
    canvas.removeEventListener('pointercancel', end);
    canvas.removeEventListener('lostpointercapture', end);
    canvas.removeEventListener('click', clickCapture, true);
    hostWindow.removeEventListener('pointerup', end);
    hostWindow.removeEventListener('pointercancel', end);
    hostWindow.removeEventListener('blur', blur);
    release();
    canvas.style.touchAction = previousTouchAction;
  };
}
