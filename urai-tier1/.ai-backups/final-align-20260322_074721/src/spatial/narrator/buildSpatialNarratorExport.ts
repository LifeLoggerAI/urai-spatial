import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type { SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import type { SpatialNarratorExport } from "@/spatial/narrator/spatialNarratorExportTypes";

export function buildSpatialNarratorExport(input: {
  accountId: string;
  accountLabel: string;
  activeLens: SpatialTimelineLens;
  activeCompareSet: SpatialCompareSet;
  compareSetCount: number;
  snapshot: SpatialPersistenceSnapshot;
}): SpatialNarratorExport {
  const exportedAt = new Date().toISOString();
  const activeCompareSetLabel = input.activeCompareSet.label ?? "Compare Set";
  const activeLensLabel = input.activeLens.label ?? "Lens";

  const summaryText = [
    `Lens: ${activeLensLabel}`,
    `Compare set: ${activeCompareSetLabel}`,
    `Compare count: ${input.compareSetCount}`,
    `Scene mode: ${input.snapshot.sceneMode}`,
    `Selected star: ${input.snapshot.selectedStarId ?? "none"}`,
  ].join("\n");

  const scriptText = [
    `Account ${input.accountLabel}.`,
    `Lens ${activeLensLabel} is active.`,
    `Compare set ${activeCompareSetLabel} is selected.`,
    `Scene mode is ${input.snapshot.sceneMode}.`,
    `Selected star is ${input.snapshot.selectedStarId ?? "none"}.`,
  ].join(" ");

  return {
    schema: "urai.spatial.narrator-export.v1",
    exportedAt,
    accountId: input.accountId,
    accountLabel: input.accountLabel,
    activeLensId: input.activeLens.id,
    activeLensLabel,
    activeCompareSetId: input.activeCompareSet.id,
    activeCompareSetLabel,
    compareSetCount: input.compareSetCount,
    title: `${input.accountLabel} · ${activeLensLabel}`,
    summaryText,
    scriptText,
  };
}
