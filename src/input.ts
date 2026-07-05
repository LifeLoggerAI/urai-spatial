/**
 * URAI Input Layer
 * Step 7: normalize all user/system inputs into kernel events
 *
 * This closes the final missing loop:
 * user action → event → kernel → state → spatial
 */

import { URAIKernel } from "./kernel";

// =========================
// Input Event Normalizer
// =========================

function toEvent(userId: string, worldId: string, type: string, payload: any) {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    timestamp: Date.now(),
    userId,
    worldId,
    payload,
  };
}

// =========================
// Browser Input Bindings (UI layer stub)
// =========================

export function bindInputToKernel(kernel: URAIKernel) {
  if (typeof window !== "undefined") {
    // Clicks → world interaction events
    window.addEventListener("click", (e) => {
      kernel.emit(
        toEvent(
          "user",
          "default-world",
          "USER_INPUT",
          {
            x: e.clientX,
            y: e.clientY,
            action: "click",
          }
        )
      );
    });

    // Keyboard → world commands
    window.addEventListener("keydown", (e) => {
      kernel.emit(
        toEvent(
          "user",
          "default-world",
          "USER_INPUT",
          {
            key: e.key,
            action: "keydown",
          }
        )
      );
    });
  }
}

// =========================
// Generic programmatic input API
// =========================

export function emitAction(
  kernel: URAIKernel,
  userId: string,
  worldId: string,
  type: string,
  payload: any
) {
  kernel.emit(toEvent(userId, worldId, type, payload));
}
