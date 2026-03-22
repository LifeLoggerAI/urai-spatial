import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type { SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import type { SpatialNarratorExport } from "@/spatial/narrator/spatialNarratorExportTypes";

export function buildSpatialNarratorExport(input: {
  accountId: string;
  accountLabel: string | null;
  activeLens: SpatialTimelineLens | null;
  activeCompareSet: SpatialCompareSet | null;
  compareSetCount: number;
  snapshot: SpatialPersistenceSnapshot;
}): SpatialNarratorExport {
  const titleParts = [
    input.accountLabel ?? "Local Account",
    input.activeLens?.label ?? "Current Runtime Lens",
  ].filter(Boolean);

  const title = titleParts.join(" · ");

  const lines = [
    `Narrator title: ${title}`,
    "",
    `Account: ${input.accountLabel ?? input.accountId}`,
    `Snapshot saved at: ${input.snapshot.savedAt}`,
    `Scene mode: ${input.snapshot.sceneMode}`,
    `Selected star: ${input.snapshot.selectedStarId ?? "none"}`,
    `Lens: ${input.activeLens?.label ?? "none"}`,
    `Lens focus: ${input.activeLens?.focus ?? "n/a"}`,
    `Lens summary: ${input.activeLens?.summary ?? "No active lens summary."}`,
    "",
    input.activeCompareSet
      ? `Compare set: ${input.activeCompareSet.label}`
      : "Compare set: none",
    input.activeCompareSet
      ? `Scene mode changed: ${input.activeCompareSet.summary.sceneModeChanged ? "yes" : "no"}`
      : "Scene mode changed: n/a",
    input.activeCompareSet
      ? `Selected star changed: ${input.activeCompareSet.summary.selectedStarChanged ? "yes" : "no"}`
      : "Selected star changed: n/a",
    input.activeCompareSet
      ? `Locomotion distance: ${input.activeCompareSet.summary.locomotionDistance}`
      : "Locomotion distance: n/a",
    "",
    `Current locomotion origin: (${input.snapshot.locomotion.userX}, ${input.snapshot.locomotion.userY}, ${input.snapshot.locomotion.userZ})`,
    `Current locomotion yaw: ${input.snapshot.locomotion.yaw}`,
    `AR plane visible: ${input.snapshot.arPlacement.visible ? "yes" : "no"}`,
    `Headset presenting: ${input.snapshot.headset.presenting ? "yes" : "no"}`,
    "",
    "Narrator script:",
    `This account is viewing ${input.snapshot.sceneMode}.`,
    input.snapshot.selectedStarId
      ? `Focus remains anchored on star ${input.snapshot.selectedStarId}.`
      : "No specific star is selected in the current runtime.",
    input.activeLens?.summary
      ? `The active lens reads: ${input.activeLens.summary}`
      : "The active lens stays centered on the current runtime.",
    input.activeCompareSet
      ? `Compared to ${input.activeCompareSet.baseline.label}, the system now maps toward ${input.activeCompareSet.target.label}.`
      : "No compare set is currently attached to this narrator export.",
    input.activeCompareSet && input.activeCompareSet.summary.locomotionDistance > 0
      ? `Movement drift has accumulated to ${input.activeCompareSet.summary.locomotionDistance} units across the compared eras.`
      : "Movement drift remains minimal across the visible narrative horizon.",
    "The next narration pass can use this export as a stable voice-over baseline.",
  ];

  return {
    schema: "urai.spatial.narrator-export.v1",
    exportedAt: new Date().toISOString(),
    accountId: input.accountId,
    accountLabel: input.accountLabel,
    lensLabel: input.activeLens?.label ?? null,
    compareSetLabel: input.activeCompareSet?.label ?? null,
    sceneMode: input.snapshot.sceneMode,
    selectedStarId: input.snapshot.selectedStarId,
    title,
    scriptText: lines.join("\n"),
    metadata: {
      locomotionDistance: input.activeCompareSet?.summary.locomotionDistance ?? null,
      compareSetCount: input.compareSetCount,
    },
  };
}
