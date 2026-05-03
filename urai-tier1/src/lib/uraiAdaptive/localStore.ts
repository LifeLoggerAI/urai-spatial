import type { UraiAdaptiveProfile } from "./types";
import { createDefaultAdaptiveProfile } from "./profile";

const KEY = "urai:tier8:adaptive-profile:v1";

export function loadAdaptiveProfile(): UraiAdaptiveProfile {
  if (typeof window === "undefined") return createDefaultAdaptiveProfile();

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return createDefaultAdaptiveProfile();
    return JSON.parse(raw) as UraiAdaptiveProfile;
  } catch {
    return createDefaultAdaptiveProfile();
  }
}

export function saveAdaptiveProfile(profile: UraiAdaptiveProfile): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // adaptive learning must never break Spatial
  }
}

export function clearAdaptiveProfile(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}
