import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialStoryBundle } from "@/spatial/bundles/spatialStoryBundleTypes";
import type { SpatialStoryBundleDiff } from "@/spatial/diffs/spatialStoryBundleDiffTypes";
import type { SpatialStoryBundleVaultEntry } from "@/spatial/vault/spatialStoryBundleVaultTypes";

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function locomotionMagnitude(bundle: SpatialStoryBundle): number {
  const x = bundle.snapshot.locomotion.userX;
  const y = bundle.snapshot.locomotion.userY;
  const z = bundle.snapshot.locomotion.userZ;
  return Math.sqrt(x * x + y * y + z * z);
}

function narratorLabel(bundle: SpatialStoryBundle): string | null {
  return bundle.narrator?.title ?? null;
}

export function buildSpatialStoryBundleDiff(input: {
  base: SpatialStoryBundleVaultEntry;
  target: SpatialStoryBundleVaultEntry;
}): SpatialStoryBundleDiff {
  const baseBundle = input.base.bundle;
  const targetBundle = input.target.bundle;

  const sameAccount = baseBundle.account.id === targetBundle.account.id;
  const sceneModeChanged =
    baseBundle.snapshot.sceneMode !== targetBundle.snapshot.sceneMode;
  const selectedStarChanged =
    (baseBundle.snapshot.selectedStarId ?? null) !==
    (targetBundle.snapshot.selectedStarId ?? null);
  const lensChanged =
    (baseBundle.activeLens?.label ?? null) !==
    (targetBundle.activeLens?.label ?? null);
  const narratorChanged =
    narratorLabel(baseBundle) !== narratorLabel(targetBundle);

  const arcCountDelta =
    targetBundle.arcs.length - baseBundle.arcs.length;
  const seasonalArcCountDelta =
    targetBundle.seasonalArcs.length - baseBundle.seasonalArcs.length;
  const locomotionDistanceDelta = round3(
    locomotionMagnitude(targetBundle) - locomotionMagnitude(baseBundle),
  );

  const parts = [
    sameAccount ? "same account scope" : "different account scope",
    sceneModeChanged ? "scene mode changed" : "scene mode stable",
    selectedStarChanged ? "selection changed" : "selection stable",
    lensChanged ? "lens changed" : "lens stable",
    narratorChanged ? "narrator changed" : "narrator stable",
    `arc delta ${arcCountDelta}`,
    `seasonal arc delta ${seasonalArcCountDelta}`,
    `locomotion magnitude delta ${locomotionDistanceDelta}`,
  ];

  return {
    schema: "urai.spatial.story-bundle-diff.v1",
    baseEntryId: input.base.id,
    targetEntryId: input.target.id,
    sameAccount,
    sceneModeChanged,
    selectedStarChanged,
    lensChanged,
    narratorChanged,
    arcCountDelta,
    seasonalArcCountDelta,
    locomotionDistanceDelta,
    summaryText: parts.join(" · "),
  };
}
