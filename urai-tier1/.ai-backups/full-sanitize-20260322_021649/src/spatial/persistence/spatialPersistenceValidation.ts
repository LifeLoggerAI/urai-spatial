import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";

export function isSpatialPersistenceSnapshot(
  value: unknown,
): value is SpatialPersistenceSnapshot {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return (
    v.schema === "urai.spatial.persistence.v1" &&
    typeof v.savedAt === "string" &&
    typeof v.sceneMode === "string" &&
    "selectedStarId" in v &&
    "selectedStarLabel" in v &&
    typeof v.headset === "object" &&
    typeof v.xrInput === "object" &&
    typeof v.arPlacement === "object" &&
    typeof v.locomotion === "object" &&
    typeof v.metrics === "object"
  );
}
