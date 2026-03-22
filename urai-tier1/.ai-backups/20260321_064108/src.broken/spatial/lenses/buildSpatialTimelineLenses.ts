import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import {
  createSystemCurrentLens,
  type SpatialTimelineLens,
  type SpatialTimelineLensFocus,
} from "@/spatial/lenses/spatialLensTypes";

function deriveFocus(compareSet: SpatialCompareSet): SpatialTimelineLensFocus {
  if (compareSet.summary.sceneModeChanged && compareSet.summary.selectedStarChanged) {
    return "balanced";
  }

  if (compareSet.summary.sceneModeChanged) {
    return "scene";
  }

  if (compareSet.summary.selectedStarChanged) {
    return "selection";
  }

  if (compareSet.summary.locomotionDistance > 0) {
    return "movement";
  }

  return "balanced";
}

function deriveSummary(compareSet: SpatialCompareSet): string {
  const parts: string[] = [];

  parts.push(
    compareSet.summary.sceneModeChanged
      ? "scene mode drift detected"
      : "scene mode stable",
  );

  parts.push(
    compareSet.summary.selectedStarChanged
      ? "selection changed"
      : "selection stable",
  );

  parts.push(
    `movement delta ${compareSet.summary.locomotionDistance}`,
  );

  return parts.join(" · ");
}

export function buildSpatialTimelineLenses(
  compareSets: SpatialCompareSet[],
): SpatialTimelineLens[] {
  const current = createSystemCurrentLens();

  const derived = compareSets.map((compareSet) => ({
    id: `lens_${compareSet.id}`,
    label: `Lens · ${compareSet.label}`,
    createdAt: compareSet.createdAt,
    source: "compare-set" as const,
    compareSetId: compareSet.id,
    focus: deriveFocus(compareSet),
    summary: deriveSummary(compareSet),
    baselineLabel: compareSet.baseline.label,
    targetLabel: compareSet.target.label,
  }));

  return [current, ...derived];
}
