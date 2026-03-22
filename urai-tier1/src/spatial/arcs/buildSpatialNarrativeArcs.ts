import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type { SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialNarrativeArc, SpatialArcKind } from "@/spatial/arcs/spatialArcTypes";

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function classifyCompareSet(compareSet: SpatialCompareSet): SpatialArcKind {
  if (!compareSet) return "mixed-transition";

  // basic fallback logic (safe)
  if ((compareSet as any).delta > 0) return "scene-shift";
  if ((compareSet as any).delta < 0) return "focus-drift";

  return "scene-shift";
}

export function buildSpatialNarrativeArcs(
  compareSets: SpatialCompareSet[],
  lenses: SpatialTimelineLens[]
): SpatialNarrativeArc[] {
  if (!compareSets || compareSets.length === 0) return [];

  return compareSets.map((set, index) => ({
    id: String(index),
    label: (set as any).label ?? "Arc",
    createdAt: new Date().toISOString(),
    kind: classifyCompareSet(set),
    compareSetIds: [(set as any).id ?? String(index)],
    intensity: round((set as any).delta ?? 0),
    summary: "Auto-generated arc",
  }));
}
