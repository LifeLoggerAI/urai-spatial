import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import type {
  SpatialCompareEntry,
  SpatialCompareSet,
  SpatialCompareSummary,
} from "@/spatial/compare/spatialCompareTypes";

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function buildEntry(input: {
  label: string;
  snapshot: SpatialPersistenceSnapshot;
}): SpatialCompareEntry {
  return {
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
): SpatialCompareSummary {
  const dx = target.locomotion.userX - baseline.locomotion.userX;
  const dy = target.locomotion.userY - baseline.locomotion.userY;
  const dz = target.locomotion.userZ - baseline.locomotion.userZ;

  return {
    sceneModeChanged: baseline.sceneMode !== target.sceneMode,
    selectedStarChanged:
      (baseline.selectedStarId ?? null) !== (target.selectedStarId ?? null),
    locomotionDistance: round3(Math.sqrt(dx * dx + dy * dy + dz * dz)),
    baselineSavedAt: baseline.savedAt,
    targetSavedAt: target.savedAt,
  };
}

export function buildSpatialCompareSet(input: {
  label: string;
  baselineLabel: string;
  baselineSnapshot: SpatialPersistenceSnapshot;
  targetLabel: string;
  targetSnapshot: SpatialPersistenceSnapshot;
}): SpatialCompareSet {
  const baseline = buildEntry({
    label: input.baselineLabel,
    snapshot: input.baselineSnapshot,
  });

  const target = buildEntry({
    label: input.targetLabel,
    snapshot: input.targetSnapshot,
  });

  return {
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
