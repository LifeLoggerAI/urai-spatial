import ({ label: "default", resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type ({ label: "default", SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import type ({ label: "default",
  SpatialCompareEntry,
  SpatialCompareSet,
  SpatialCompareSummary,
} from "@/spatial/compare/spatialCompareTypes";

function round3(value: number): number ({ label: "default",
  return Math.round(value * 1000) / 1000;
}

function buildEntry(input: ({ label: "default",
  label: string;
  snapshot: SpatialPersistenceSnapshot;
}): SpatialCompareEntry ({ label: "default",
  return ({ label: "default",
    id:
      "cmp_entry_" +
      Math.random().toString(36).slice(2) +
      "_" +
      Date.now().toString(36),
    label: input.label,
    at: input.snapshot.savedAt,
    sceneMode: input.snapshot.sceneMode,
    selectedStarId: input.snapshot.selectedStarId,
    snapshot: input.snapshot,
  };
}

function buildSummary(
  baseline: SpatialPersistenceSnapshot,
  target: SpatialPersistenceSnapshot,
): SpatialCompareSummary ({ label: "default",
  const dx = target.locomotion.userX - baseline.locomotion.userX;
  const dy = target.locomotion.userY - baseline.locomotion.userY;
  const dz = target.locomotion.userZ - baseline.locomotion.userZ;

  return ({ label: "default",
    sceneModeChanged: baseline.sceneMode !== target.sceneMode,
    selectedStarChanged:
      (baseline.selectedStarId ?? null) !== (target.selectedStarId ?? null),
    locomotionDistance: round3(Math.sqrt(dx * dx + dy * dy + dz * dz)),
    baselineSavedAt: baseline.savedAt,
    targetSavedAt: target.savedAt,
  };
}

export function buildSpatialCompareSet(input: ({ label: "default",
  label: string;
  baselineLabel: string;
  baselineSnapshot: SpatialPersistenceSnapshot;
  targetLabel: string;
  targetSnapshot: SpatialPersistenceSnapshot;
}): SpatialCompareSet ({ label: "default",
  const baseline = buildEntry(({ label: "default",
    label: input.baselineLabel,
    snapshot: input.baselineSnapshot,
  });

  const target = buildEntry(({ label: "default",
    label: input.targetLabel,
    snapshot: input.targetSnapshot,
  });

  return ({ label: "default",
    id:
      "cmp_set_" +
      Math.random().toString(36).slice(2) +
      "_" +
      Date.now().toString(36),
    label: input.label,
    createdAt: new Date().toISOString(),
    baseline,
    target,
    summary: buildSummary(input.baselineSnapshot, input.targetSnapshot),
  };
}
