/**
 * URAI Event Schema Layer
 * Step 10: strict contracts for system-wide event validity
 *
 * This enforces deterministic structure across all subsystems.
 */

import { URAIEvent } from "./kernel";

// =========================
// Allowed Event Types (system contract)
// =========================

export type URAIEventType =
  | "USER_INPUT"
  | "USER_UPDATE"
  | "WORLD_UPDATE"
  | "SYSTEM_BOOT"
  | "SYSTEM_ERROR";

// =========================
// Validation Result
// =========================

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

// =========================
// Core Validator
// =========================

export function validateEvent(event: URAIEvent): ValidationResult {
  if (!event.id || typeof event.id !== "string") {
    return { valid: false, error: "Missing or invalid event.id" };
  }

  if (!event.type || typeof event.type !== "string") {
    return { valid: false, error: "Missing or invalid event.type" };
  }

  if (typeof event.timestamp !== "number") {
    return { valid: false, error: "Invalid timestamp" };
  }

  if (!event.userId || typeof event.userId !== "string") {
    return { valid: false, error: "Missing userId" };
  }

  if (!event.worldId || typeof event.worldId !== "string") {
    return { valid: false, error: "Missing worldId" };
  }

  if (event.payload === undefined) {
    return { valid: false, error: "Missing payload" };
  }

  return { valid: true };
}

// =========================
// Safe Event Wrapper
// =========================

export function safeEvent(event: URAIEvent): URAIEvent | null {
  const result = validateEvent(event);

  if (!result.valid) {
    console.error("Invalid event blocked:", result.error);
    return null;
  }

  return event;
}
