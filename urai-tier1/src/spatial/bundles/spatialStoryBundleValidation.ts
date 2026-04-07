import type { SpatialStoryBundle } from "@/spatial/bundles/spatialStoryBundleTypes";

export function isSpatialStoryBundle(value: any): value is SpatialStoryBundle {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return (
    v.schema === "urai.spatial.story-bundle.v1" &&
    typeof v.exportedAt === "string" &&
    !!v.account &&
    typeof v.account === "object" &&
    !!v.snapshot &&
    typeof v.snapshot === "object" &&
    "summaryText" in v &&
    typeof v.summaryText === "string"
  );
}
