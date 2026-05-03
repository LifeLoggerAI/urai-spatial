import type { SpatialNarrativeArc } from "@/spatial/arcs/spatialArcTypes";
import type { SpatialSeasonalArc } from "@/spatial/arcs/spatialSeasonalArcTypes";
import type { SpatialLensId } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialNarratorExport } from "@/spatial/narrator/spatialNarratorTypes";
import type { SpatialSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import type { SpatialStoryBundle } from "@/spatial/bundles/spatialStoryBundleTypes";

export function buildSpatialStoryBundle(input: {
  accountId: string;
  accountLabel?: string | null;
  snapshot: SpatialSnapshot;
  activeLens: SpatialLensId;
  arcs: SpatialNarrativeArc[];
  seasonalArcs: SpatialSeasonalArc[];
  narrator: SpatialNarratorExport | null;
}): SpatialStoryBundle {
  const exportedAt = new Date().toISOString();

  return {
    schema: "urai.spatial.story-bundle.v1",
    id: input.accountId,
    label: input.accountLabel ?? "Story",
    createdAt: exportedAt,
    exportedAt,
    account: {
      id: input.accountId,
      label: input.accountLabel ?? "Story",
    },
    snapshot: input.snapshot,
    activeLens: input.activeLens,
    arcs: input.arcs,
    seasonalArcs: input.seasonalArcs,
    narrator: input.narrator?.text ?? "",
    summaryText: "",
  } as SpatialStoryBundle;
}
