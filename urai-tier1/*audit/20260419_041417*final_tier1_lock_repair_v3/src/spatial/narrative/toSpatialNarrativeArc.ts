import type { SpatialArc } from "@/spatial/arcs/spatialArcStore";
import type { SpatialNarrativeArc } from "@/spatial/arcs/spatialArcTypes";

function isSpatialNarrativeArc(value: SpatialArc | SpatialNarrativeArc): value is SpatialNarrativeArc {
  return (
    "createdAt" in value &&
    "kind" in value &&
    "compareSetIds" in value &&
    "intensity" in value &&
    "summary" in value &&
    "label" in value &&
    typeof value.label === "string"
  );
}

export function toSpatialNarrativeArc(
  arc: SpatialArc | SpatialNarrativeArc,
): SpatialNarrativeArc {
  if (isSpatialNarrativeArc(arc)) {
    return arc;
  }

  const maybeCreatedAt =
    "storedAt" in arc && typeof arc.storedAt === "string" && arc.storedAt.length > 0
      ? arc.storedAt
      : "updatedAt" in arc && typeof arc.updatedAt === "string" && arc.updatedAt.length > 0
        ? arc.updatedAt
        : "detectedAt" in arc && typeof arc.detectedAt === "string" && arc.detectedAt.length > 0
          ? arc.detectedAt
          : new Date(0).toISOString();

  const label =
    "label" in arc && typeof arc.label === "string" && arc.label.length > 0
      ? arc.label
      : "Arc";

  const compareSetIds: string[] = [];

  return {
    ...arc,
    label,
    createdAt: maybeCreatedAt,
    kind: "arc" as SpatialNarrativeArc["kind"],
    compareSetIds,
    intensity: 0,
    summary: "",
  };
}

export function toSpatialNarrativeArcs(
  arcs: readonly (SpatialArc | SpatialNarrativeArc)[],
): SpatialNarrativeArc[] {
  return arcs.map(toSpatialNarrativeArc);
}
