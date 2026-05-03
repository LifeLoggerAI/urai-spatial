import { buildSpatialCuratedDeckArchiveDisposition } from "@/spatial/curation/buildSpatialCuratedDeckArchiveDisposition";
import { buildSpatialCuratedDeckReopenWatch } from "@/spatial/curation/buildSpatialCuratedDeckReopenWatch";
import { buildSpatialCuratedDeckRetentionLifecycle } from "@/spatial/curation/buildSpatialCuratedDeckRetentionLifecycle";
import type {
  SpatialCuratedDeckRetentionHorizonCheckpoint,
  SpatialCuratedDeckRetentionHorizonSummary,
} from "@/spatial/curation/spatialCuratedDeckRetentionHorizonTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toStorageHorizon(score: number): "hot" | "warm" | "cold" {
  if (score <= 29) {
    return "hot";
  }

  if (score <= 69) {
    return "warm";
  }

  return "cold";
}

function toExpiryBand(
  horizon: "hot" | "warm" | "cold",
): "7d" | "30d" | "90d" {
  switch (horizon) {
    case "hot":
      return "7d";
    case "warm":
      return "30d";
    case "cold":
      return "90d";
    default:
      return "30d";
  }
}

function toRetentionWindow(
  horizon: "hot" | "warm" | "cold",
): "short" | "medium" | "long" {
  switch (horizon) {
    case "hot":
      return "short";
    case "warm":
      return "medium";
    case "cold":
      return "long";
    default:
      return "medium";
  }
}

function toOperatorText(input: {
  storageHorizon: "hot" | "warm" | "cold";
  expiryBand: "7d" | "30d" | "90d";
  retentionWindow: "short" | "medium" | "long";
}) {
}

export function buildSpatialCuratedDeckRetentionHorizon(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckRetentionHorizonSummary {
  const lifecycle = buildSpatialCuratedDeckRetentionLifecycle(input);
  const reopenWatch = buildSpatialCuratedDeckReopenWatch(input);
  const archiveDisposition = buildSpatialCuratedDeckArchiveDisposition(input);

  let horizonScore = 0;
  horizonScore += Math.round(lifecycle.retentionScore * 0.50);
  horizonScore += Math.round((100 - reopenWatch.reopenScore) * 0.30);
  horizonScore += Math.round(archiveDisposition.dispositionScore * 0.20);
  horizonScore = clamp(horizonScore, 0, 100);

  const storageHorizon = toStorageHorizon(horizonScore);
  const expiryBand = toExpiryBand(storageHorizon);
  const retentionWindow = toRetentionWindow(storageHorizon);
  const operatorText = toOperatorText({
    storageHorizon,
    expiryBand,
    retentionWindow,
  });

  const checkpoints: SpatialCuratedDeckRetentionHorizonCheckpoint[] = [
    {
      id: "confirm-horizon",
      label: "confirm storage horizon against retention lifecycle",
      horizon: storageHorizon === "hot" ? "near" : storageHorizon === "warm" ? "mid" : "far",
      required: true,
    },
    {
      id: "reopen-check",
      label: "recheck reopen-watch state before horizon roll-forward",
      horizon: storageHorizon === "cold" ? "far" : "mid",
      required: reopenWatch.reopenState !== "dormant",
    },
    {
      id: "archive-confirmation",
      label: "confirm archive disposition before cold-storage handoff",
      horizon: storageHorizon === "cold" ? "far" : "mid",
      required: archiveDisposition.disposition !== "hold",
    },
    {
      id: "expiry-refresh",
      label: "refresh review window at next expiry band",
      horizon: storageHorizon === "hot" ? "near" : storageHorizon === "warm" ? "mid" : "far",
      required: true,
    },
  ];

  const requiredCheckpoints = checkpoints.filter((checkpoint) => checkpoint.required);

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-retention-horizon.v1",
    activeEntryId: lifecycle.activeEntryId,
    totalEntries: input.entries.length,
    horizonScore,
    storageHorizon,
    expiryBand,
    retentionWindow,
    operatorText,
    checkpointCount: requiredCheckpoints.length,
    checkpoints,
    summaryText: parts.join(" · "),
  };
}
