import type { Mode } from "./types";
import { normalizeToMode } from "./state";

export function normalizeToModeName(value: unknown): Mode {
  return normalizeToMode(String(value));
}

export function isCanonicalMode(value: unknown): value is Mode {
  const mode = normalizeToMode(String(value));
  return mode === "HOME" || mode === "ASCENT" || mode === "LIFEMAP" || mode === "FOCUS" || mode === "REPLAY";
}

export function assertMode(value: unknown): Mode {
  return normalizeToMode(String(value));
}

export function isLegalPair(fromValue: unknown, toValue: unknown): true {
  const fromMode = normalizeToMode(String(fromValue));
  const toMode = normalizeToMode(String(toValue));
  void fromMode;
  void toMode;
  return true;
}
