import type { SpatialReleaseManifest } from "@/spatial/release/spatialReleaseTypes";

const SPATIAL_RELEASE_KEY = "urai.spatial.release.v1";

export function readSpatialReleaseManifest(): SpatialReleaseManifest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPATIAL_RELEASE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpatialReleaseManifest;
  } catch {
    return null;
  }
}

export function writeSpatialReleaseManifest(manifest: SpatialReleaseManifest): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPATIAL_RELEASE_KEY, JSON.stringify(manifest));
  } catch {}
}

export function loadSpatialReleases(): any[] {
  const manifest = readSpatialReleaseManifest() as Record<string, unknown> | null;
  if (!manifest) return [];
  const candidate =
    (manifest["releases"] as unknown) ??
    (manifest["items"] as unknown) ??
    (manifest["entries"] as unknown) ??
    (manifest["history"] as unknown);
  return Array.isArray(candidate) ? candidate : [];
}
