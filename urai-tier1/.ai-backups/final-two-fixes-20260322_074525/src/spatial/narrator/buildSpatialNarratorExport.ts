import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type { SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";

export type SpatialNarratorExport = {
  id: string;
  title: string;
  scriptText: string;
  summaryText: string;
  metadata: {
    accountId: string;
    accountLabel: string;
    activeLensId: string;
    activeLensLabel: string;
    activeCompareSetId: string;
    activeCompareSetLabel: string;
    compareSetCount: number;
    snapshotCapturedAt: string;
  };
};

export function buildSpatialNarratorExport(input: {
  accountId: string;
  accountLabel: string;
  activeLens: SpatialTimelineLens;
  activeCompareSet: SpatialCompareSet;
  compareSetCount: number;
  snapshot: SpatialPersistenceSnapshot;
}): SpatialNarratorExport {
  const title = `${input.accountLabel} · ${input.activeLens.label}`;
  const summaryText = [
    `Lens: ${input.activeLens.label}`,
    `Compare set: ${input.activeCompareSet.label}`,
    `Compare count: ${input.compareSetCount}`,
  ].join("\n");

  const scriptText = [
    `Account ${input.accountLabel}.`,
    `Lens ${input.activeLens.label} is active.`,
    `Compare set ${input.activeCompareSet.label} is selected.`,
    `Scene summary prepared from the current persistence snapshot.`,
  ].join(" ");

  return {
    id: `narrator-export-${input.activeLens.id}-${input.activeCompareSet.id}`,
    title,
    scriptText,
    summaryText,
    metadata: {
      accountId: input.accountId,
      accountLabel: input.accountLabel,
      activeLensId: input.activeLens.id,
      activeLensLabel: input.activeLens.label,
      activeCompareSetId: input.activeCompareSet.id,
      activeCompareSetLabel: input.activeCompareSet.label,
      compareSetCount: input.compareSetCount,
      snapshotCapturedAt:
        (input.snapshot as { capturedAt?: string }).capturedAt ?? new Date(0).toISOString(),
    },
  };
}
