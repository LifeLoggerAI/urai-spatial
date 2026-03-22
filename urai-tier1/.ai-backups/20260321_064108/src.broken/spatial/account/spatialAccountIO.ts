import {
  SPATIAL_ACCOUNT_STORAGE_KEY,
  SPATIAL_DEFAULT_ACCOUNT_ID,
  createDefaultSpatialAccountManifest,
  type SpatialAccountManifest,
  type SpatialAccountProfile,
} from "@/spatial/account/spatialAccountTypes";

function sanitizeProfiles(
  profiles: SpatialAccountProfile[] | undefined,
): SpatialAccountProfile[] {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return createDefaultSpatialAccountManifest().profiles;
  }

  const next = profiles
    .filter((item) => item && typeof item.id === "string" && typeof item.label === "string")
    .map((item) => ({
      id: item.id,
      label: item.label,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }));

  return next.length > 0 ? next : createDefaultSpatialAccountManifest().profiles;
}

export function readSpatialAccountManifest(): SpatialAccountManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialAccountManifest();
  }

  try {
    const raw = window.localStorage.getItem(SPATIAL_ACCOUNT_STORAGE_KEY);
    if (!raw) return createDefaultSpatialAccountManifest();

    const parsed = JSON.parse(raw) as SpatialAccountManifest;
    if (parsed?.schema !== "urai.spatial.account.v1") {
      return createDefaultSpatialAccountManifest();
    }

    const profiles = sanitizeProfiles(parsed.profiles);
    const activeAccountId = profiles.some((item) => item.id === parsed.activeAccountId)
      ? parsed.activeAccountId
      : profiles[0]?.id ?? SPATIAL_DEFAULT_ACCOUNT_ID;

    return {
      schema: "urai.spatial.account.v1",
      activeAccountId,
      profiles,
    };
  } catch (_err) {
    return createDefaultSpatialAccountManifest();
  }
}

export function writeSpatialAccountManifest(
  manifest: SpatialAccountManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    const profiles = sanitizeProfiles(manifest.profiles);
    const activeAccountId = profiles.some((item) => item.id === manifest.activeAccountId)
      ? manifest.activeAccountId
      : profiles[0]?.id ?? SPATIAL_DEFAULT_ACCOUNT_ID;

    window.localStorage.setItem(
      SPATIAL_ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        schema: "urai.spatial.account.v1",
        activeAccountId,
        profiles,
      }),
    );
  } catch (_err) {}
}

export function readActiveSpatialAccountId(): string {
  return readSpatialAccountManifest().activeAccountId || SPATIAL_DEFAULT_ACCOUNT_ID;
}

export function createSpatialAccountProfile(label: string): SpatialAccountProfile {
  const safeLabel = label.trim() || "New Profile";
  return {
    id:
      "acct_" +
      Math.random().toString(36).slice(2) +
      "_" +
      Date.now().toString(36),
    label: safeLabel,
    createdAt: new Date().toISOString(),
  };
}
