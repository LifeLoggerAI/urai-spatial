import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type { SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialNarrativeArc, SpatialArcKind } from "@/spatial/arcs/spatialArcTypes";

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function classifyCompareSet(compareSet: SpatialCompareSet): {
  kind: SpatialArcKind;
  intensity: number;
  summary: string;
} {
  const sceneChanged = compareSet.summary.sceneModeChanged;
  const selectionChanged = compareSet.summary.selectedStarChanged;
  const movement = compareSet.summary.locomotionDistance;

  if (sceneChanged && selectionChanged && movement > 0) {
    return {
      kind: "mixed-transition",
      intensity: round3(1 + movement),
      summary:
        "Scene, focus, and movement all shifted across the compared eras.",
    };
  }

  if (sceneChanged) {
    return {
      kind: "scene-shift",
      intensity: round3(1 + movement * 0.25),
      summary: "Scene mode drift defines this arc more than focus or movement.",
    };
  }

  if (selectionChanged) {
    return {
      kind: "focus-drift",
      intensity: round3(1 + movement * 0.25),
      summary: "Selection drift dominates this arc across the compared eras.",
    };
  }

  if (movement > 0) {
    return {
      kind: "movement-drift",
      intensity: round3(movement),
      summary: "Movement drift is the strongest signal across the compared eras.",
    };
  }

  return {
    kind: "stable-return",
    intensity: 0,
    summary: "The compared eras resolve toward a stable return state.",
  };
}

export function buildSpatialNarrativeArcs(input: {
  compareSets: SpatialCompareSet[];
  activeLens: SpatialTimelineLens | null;
}): SpatialNarrativeArc[] {
  return input.compareSets.map((compareSet, index) => {
    const classified = classifyCompareSet(compareSet);
    const lensNote =
      input.activeLens?.compareSetId === compareSet.id
        ? " Active lens aligns with this arc."
        : "";

    return {
      id: `arc_${compareSet.id}`,
      label: `Arc ${index + 1} · ${compareSet.label}`,
      createdAt: compareSet.createdAt,
      kind: classified.kind,
      compareSetIds: [compareSet.id],
      intensity: classified.intensity,
      summary: classified.summary + lensNote,
    };
  });
}
