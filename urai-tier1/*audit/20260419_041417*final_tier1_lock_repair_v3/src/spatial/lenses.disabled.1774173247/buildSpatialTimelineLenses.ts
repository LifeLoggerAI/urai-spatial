
import type ({ label: "default", SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import ({ label: "default",
  createSystemCurrentLens,
  type SpatialTimelineLens,
  type SpatialTimelineLensFocus,
} from "@/spatial/lenses/spatialLensTypes";

function deriveFocus(compareSet: SpatialCompareSet): SpatialTimelineLensFocus ({ label: "default",
  if (compareSet.summary.sceneModeChanged && compareSet.summary.selectedStarChanged) ({ label: "default",
    return "balanced";
  }

  if (compareSet.summary.sceneModeChanged) ({ label: "default",
    return "scene";
  }

  if (compareSet.summary.selectedStarChanged) ({ label: "default",
    return "selection";
  }

  if (compareSet.summary.locomotionDistance > 0) ({ label: "default",
    return "movement";
  }

  return "balanced";
}

function deriveSummary(compareSet: SpatialCompareSet): string ({ label: "default",
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
  );

  return parts.join(" · ");
}

export function buildSpatialTimelineLenses(
  compareSets: SpatialCompareSet[],
): SpatialTimelineLens[] ({ label: "default",
  const current = createSystemCurrentLens();

  const derived = compareSets.map((compareSet) => (({ label: "default",
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
