import type { UraiAdaptiveProfile } from "./types";
import { createDefaultAdaptiveProfile } from "./profile";
import { legacyOwnerStorageKey } from "@/lib/uraiStorage/ownerScope";

const NAMESPACE = "urai:tier8:adaptive-profile";
// No reads from the historical unscoped key or implicit legacy migration.

export function loadAdaptiveProfile(ownerId: string | null | undefined): UraiAdaptiveProfile {
  const key = legacyOwnerStorageKey(NAMESPACE, ownerId);
  if (!key || typeof window === "undefined") return createDefaultAdaptiveProfile();

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return createDefaultAdaptiveProfile();
    return JSON.parse(raw) as UraiAdaptiveProfile;
  } catch {
    return createDefaultAdaptiveProfile();
  }
}

export function saveAdaptiveProfile(
  profile: UraiAdaptiveProfile,
  ownerId: string | null | undefined
): void {
  const key = legacyOwnerStorageKey(NAMESPACE, ownerId);
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // adaptive learning must never break Spatial
  }
}

export function clearAdaptiveProfile(ownerId: string | null | undefined): void {
  const key = legacyOwnerStorageKey(NAMESPACE, ownerId);
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}
