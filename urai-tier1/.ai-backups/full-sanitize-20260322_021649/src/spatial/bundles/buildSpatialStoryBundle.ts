import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialNarrativeArc } from "@/spatial/arcs/spatialArcTypes";
import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type { SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialNarratorExport } from "@/spatial/narrator/spatialNarratorExportTypes";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import type { SpatialSeasonalArc } from "@/spatial/seasonal/spatialSeasonalArcTypes";
import type { SpatialStoryBundle } from "@/spatial/bundles/spatialStoryBundleTypes";

export function buildSpatialStoryBundle(input: {
  accountId: string;
  accountLabel: string | null;
  snapshot: SpatialPersistenceSnapshot;
  activeLens: SpatialTimelineLens | null;
  activeCompareSet: SpatialCompareSet | null;
  arcs: SpatialNarrativeArc[];
  seasonalArcs: SpatialSeasonalArc[];
  narrator: SpatialNarratorExport | null;
}): SpatialStoryBundle {
  const lines = [
    `Story bundle for ${input.accountLabel ?? input.accountId}`,
    `Scene mode: ${input.snapshot.sceneMode}`,
    `Selected star: ${input.snapshot.selectedStarId ?? "none"}`,
    `Active lens: ${input.activeLens?.label ?? "none"}`,
    `Active compare set: ${input.activeCompareSet?.label ?? "none"}`,
    `Narrative arcs: ${input.arcs.length}`,
    `Seasonal arcs: ${input.seasonalArcs.length}`,
    input.narrator
      ? `Narrator export title: ${input.narrator.title}`
      : "Narrator export: none",
  ];

  return {
    schema: "urai.spatial.story-bundle.v1",
    exportedAt: new Date().toISOString(),
    account: {
      id: input.accountId,
      label: input.accountLabel,
    },
    snapshot: input.snapshot,
    activeLens: input.activeLens,
    activeCompareSet: input.activeCompareSet,
    arcs: input.arcs,
    seasonalArcs: input.seasonalArcs,
    narrator: input.narrator,
    summaryText: lines.join("\n"),
  };
}
