import { buildSpatialCuratedDeckArchiveDisposition } from "@/spatial/curation/buildSpatialCuratedDeckArchiveDisposition";
import { buildSpatialCuratedDeckClosureCertificate } from "@/spatial/curation/buildSpatialCuratedDeckClosureCertificate";
import { buildSpatialCuratedDeckReopenWatch } from "@/spatial/curation/buildSpatialCuratedDeckReopenWatch";
import type {
  SpatialCuratedDeckRetentionLifecycleSignal,
  SpatialCuratedDeckRetentionLifecycleSummary,
} from "@/spatial/curation/spatialCuratedDeckRetentionLifecycleTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toRetentionState(score: number): "hot-hold" | "watch-retained" | "cold-archived" {
  if (score <= 29) {
    return "hot-hold";
  }

  if (score <= 69) {
    return "watch-retained";
  }

  return "cold-archived";
}

function toReviewCadence(
  state: "hot-hold" | "watch-retained" | "cold-archived",
): "daily" | "weekly" | "monthly" {
  switch (state) {
    case "hot-hold":
      return "daily";
    case "watch-retained":
      return "weekly";
    case "cold-archived":
      return "monthly";
    default:
      return "weekly";
  }
}

function toRetentionPath(
  state: "hot-hold" | "watch-retained" | "cold-archived",
): "keep-live" | "guarded-retention" | "archive-cold" {
  switch (state) {
    case "hot-hold":
      return "keep-live";
    case "watch-retained":
      return "guarded-retention";
    case "cold-archived":
      return "archive-cold";
    default:
      return "guarded-retention";
  }
}

function toOperatorText(input: {
  retentionState: "hot-hold" | "watch-retained" | "cold-archived";
  reviewCadence: "daily" | "weekly" | "monthly";
  retentionPath: "keep-live" | "guarded-retention" | "archive-cold";
}) {
}

export function buildSpatialCuratedDeckRetentionLifecycle(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckRetentionLifecycleSummary {
  const archiveDisposition = buildSpatialCuratedDeckArchiveDisposition(input);
  const reopenWatch = buildSpatialCuratedDeckReopenWatch(input);
  const certificate = buildSpatialCuratedDeckClosureCertificate(input);

  const signals: SpatialCuratedDeckRetentionLifecycleSignal[] = [
    {
      id: "archive-ready",
      label: "archive disposition is archive",
      weight: "high",
      active: archiveDisposition.disposition === "archive",
    },
    {
      id: "archive-requeue",
      label: "archive disposition remains requeue",
      weight: "medium",
      active: archiveDisposition.disposition === "requeue",
    },
    {
      id: "reopen-dormant",
      label: "reopen watch is dormant",
      weight: "high",
      active: reopenWatch.reopenState === "dormant",
    },
    {
      id: "reopen-guarded",
      label: "reopen watch remains guarded",
      weight: "medium",
      active: reopenWatch.reopenState === "guarded",
    },
    {
      id: "certificate-issued",
      label: "closure certificate is issued",
      weight: "high",
      active: certificate.certificateState === "issued",
    },
    {
      id: "certificate-provisional",
      label: "closure certificate remains provisional",
      weight: "medium",
      active: certificate.certificateState === "provisional",
    },
  ];

  let retentionScore = 0;
  retentionScore += Math.round(archiveDisposition.dispositionScore * 0.45);
  retentionScore += Math.round((100 - reopenWatch.reopenScore) * 0.30);
  retentionScore += Math.round(certificate.closureScore * 0.25);
  retentionScore = clamp(retentionScore, 0, 100);

  const retentionState = toRetentionState(retentionScore);
  const reviewCadence = toReviewCadence(retentionState);
  const retentionPath = toRetentionPath(retentionState);
  const operatorText = toOperatorText({
    retentionState,
    reviewCadence,
    retentionPath,
  });

  const activeSignalCount = signals.filter((signal) => signal.active).length;

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-retention-lifecycle.v1",
    activeEntryId: archiveDisposition.activeEntryId,
    totalEntries: input.entries.length,
    retentionScore,
    retentionState,
    reviewCadence,
    retentionPath,
    operatorText,
    activeSignalCount,
    signals,
    summaryText: parts.join(" · "),
  };
}
