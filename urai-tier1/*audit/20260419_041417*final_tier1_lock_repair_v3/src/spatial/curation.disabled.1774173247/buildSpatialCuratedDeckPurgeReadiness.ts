import { buildSpatialCuratedDeckArchiveDisposition } from "@/spatial/curation/buildSpatialCuratedDeckArchiveDisposition";
import { buildSpatialCuratedDeckExpiryGovernance } from "@/spatial/curation/buildSpatialCuratedDeckExpiryGovernance";
import { buildSpatialCuratedDeckRetentionHorizon } from "@/spatial/curation/buildSpatialCuratedDeckRetentionHorizon";
import { buildSpatialCuratedDeckReopenWatch } from "@/spatial/curation/buildSpatialCuratedDeckReopenWatch";
import type {
  SpatialCuratedDeckPurgeReadinessCheck,
  SpatialCuratedDeckPurgeReadinessSummary,
} from "@/spatial/curation/spatialCuratedDeckPurgeReadinessTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toPurgePosture(score: number): "keep" | "review" | "purge-ready" {
  if (score <= 29) {
    return "keep"
  }

  if (score <= 69) {
    return "review"
  }

  return "purge-ready"
}

function toDeletionEligibility(score: number): "blocked" | "conditional" | "eligible" {
  if (score <= 29) {
    return "blocked"
  }

  if (score <= 69) {
    return "conditional"
  }

  return "eligible"
}

function toOperatorText(input: {
  purgePosture: "keep" | "review" | "purge-ready";
  deletionEligibility: "blocked" | "conditional" | "eligible";
  coldStorageSafe: boolean;
}) {
}

export function buildSpatialCuratedDeckPurgeReadiness(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckPurgeReadinessSummary {
  const expiry = buildSpatialCuratedDeckExpiryGovernance(input);
  const horizon = buildSpatialCuratedDeckRetentionHorizon(input);
  const reopenWatch = buildSpatialCuratedDeckReopenWatch(input);
  const archiveDisposition = buildSpatialCuratedDeckArchiveDisposition(input);

  let purgeScore = 0
  purgeScore += Math.round(expiry.expiryScore * 0.40)
  purgeScore += Math.round(horizon.horizonScore * 0.25)
  purgeScore += Math.round((100 - reopenWatch.reopenScore) * 0.20)
  purgeScore += Math.round(archiveDisposition.dispositionScore * 0.15)
  purgeScore = clamp(purgeScore, 0, 100)

  const purgePosture = toPurgePosture(purgeScore)
  const deletionEligibility = toDeletionEligibility(purgeScore)

  const coldStorageSafe =
    expiry.coldStorageEligible &&
    horizon.storageHorizon === "cold" &&
    reopenWatch.reopenState === "dormant" &&
    archiveDisposition.disposition === "archive"

  const checks: SpatialCuratedDeckPurgeReadinessCheck[] = [
    {
      id: "expiry-ready",
      label: "expiry governance is expire-ready",
      status:
        expiry.expiryPosture === "expire-ready"
          ? "passed"
          : expiry.expiryPosture === "review"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "cold-horizon",
      label: "retention horizon is cold with long window",
      status:
        horizon.storageHorizon === "cold"
          ? "passed"
          : horizon.storageHorizon === "warm"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "reopen-dormant",
      label: "reopen watch is dormant",
      status:
        reopenWatch.reopenState === "dormant"
          ? "passed"
          : reopenWatch.reopenState === "guarded"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "archive-lane",
      label: "archive disposition remains archive",
      status:
        archiveDisposition.disposition === "archive"
          ? "passed"
          : archiveDisposition.disposition === "requeue"
            ? "pending"
            : "blocked",
      required: true,
    },
  ]

  const requiredCheckCount = checks.filter(
    (check) => check.required && check.status !== "passed",
  ).length

  const operatorText = toOperatorText({
    purgePosture,
    deletionEligibility,
    coldStorageSafe,
  })

  const parts = [
  ]

  return {
    schema: "urai.spatial.curated-deck-purge-readiness.v1",
    activeEntryId: expiry.activeEntryId,
    totalEntries: input.entries.length,
    purgeScore,
    purgePosture,
    deletionEligibility,
    coldStorageSafe,
    operatorText,
    requiredCheckCount,
    checks,
    summaryText: parts.join(" · "),
  }
}
