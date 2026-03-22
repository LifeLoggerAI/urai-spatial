import { buildSpatialCuratedDeckDiff } from "@/spatial/curation/buildSpatialCuratedDeckDiff";
import type {
  SpatialCuratedDeckChangeLedger,
  SpatialCuratedDeckChangeLedgerRow,
} from "@/spatial/curation/spatialCuratedDeckChangeLedgerTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function toLedgerRow(
  base: SpatialCuratedDeckVaultEntry,
  target: SpatialCuratedDeckVaultEntry,
): SpatialCuratedDeckChangeLedgerRow {
  const diff = buildSpatialCuratedDeckDiff({ base, target });

  return {
    id: `${base.id}__${target.id}`,
    baseEntryId: diff.baseEntryId,
    targetEntryId: diff.targetEntryId,
    label: `${base.label} → ${target.label}`,
    summaryText: diff.summaryText,
    cardCountDelta: diff.cardCountDelta,
    sceneModeShiftCount: diff.sceneModeShiftCount,
    selectedStarShiftCount: diff.selectedStarShiftCount,
    sameAccount: diff.sameAccount,
    sourceChanged: diff.sourceChanged,
    firstCardChanged: diff.firstCardChanged,
  };
}

export function buildSpatialCuratedDeckChangeLedger(input: {
  entries: SpatialCuratedDeckVaultEntry[];
}): SpatialCuratedDeckChangeLedger {
  const rows: SpatialCuratedDeckChangeLedgerRow[] = [];

  for (let i = 1; i < input.entries.length; i += 1) {
    const base = input.entries[i - 1];
    const target = input.entries[i];

    if (!base || !target) {
      continue;
    }

    rows.push(toLedgerRow(base, target));
  }

  return {
    schema: "urai.spatial.curated-deck-change-ledger.v1",
    rowCount: rows.length,
    rows,
  };
}
