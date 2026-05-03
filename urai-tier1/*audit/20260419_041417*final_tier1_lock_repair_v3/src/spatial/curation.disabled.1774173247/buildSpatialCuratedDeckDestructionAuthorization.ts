import { buildSpatialCuratedDeckArchiveDisposition } from "@/spatial/curation/buildSpatialCuratedDeckArchiveDisposition";
import { buildSpatialCuratedDeckExpiryGovernance } from "@/spatial/curation/buildSpatialCuratedDeckExpiryGovernance";
import { buildSpatialCuratedDeckPurgeReadiness } from "@/spatial/curation/buildSpatialCuratedDeckPurgeReadiness";
import type {
  SpatialCuratedDeckDestructionAuthorizationCheck,
  SpatialCuratedDeckDestructionAuthorizationSignal,
  SpatialCuratedDeckDestructionAuthorizationSummary,
} from "@/spatial/curation/spatialCuratedDeckDestructionAuthorizationTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toAuthorization(score: number): "deny" | "review" | "authorize" {
  if (score <= 29) {
    return "deny";
  }

  if (score <= 69) {
    return "review";
  }

  return "authorize";
}

function toDestructionPath(
  authorization: "deny" | "review" | "authorize",
): "retain" | "guarded-destruction" | "destroy-candidate" {
  switch (authorization) {
    case "deny":
      return "retain";
    case "review":
      return "guarded-destruction";
    case "authorize":
      return "destroy-candidate";
    default:
      return "retain";
  }
}

function toEvidenceState(score: number): "insufficient" | "partial" | "sufficient" {
  if (score <= 29) {
    return "insufficient";
  }

  if (score <= 69) {
    return "partial";
  }

  return "sufficient";
}

function toOperatorText(input: {
  authorization: "deny" | "review" | "authorize";
  destructionPath: "retain" | "guarded-destruction" | "destroy-candidate";
  evidenceState: "insufficient" | "partial" | "sufficient";
}) {
}

export function buildSpatialCuratedDeckDestructionAuthorization(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckDestructionAuthorizationSummary {
  const purge = buildSpatialCuratedDeckPurgeReadiness(input);
  const expiry = buildSpatialCuratedDeckExpiryGovernance(input);
  const archiveDisposition = buildSpatialCuratedDeckArchiveDisposition(input);

  let authorizationScore = 0;
  authorizationScore += Math.round(purge.purgeScore * 0.55);
  authorizationScore += Math.round(expiry.expiryScore * 0.30);
  authorizationScore += Math.round(archiveDisposition.dispositionScore * 0.15);
  authorizationScore = clamp(authorizationScore, 0, 100);

  const authorization = toAuthorization(authorizationScore);
  const destructionPath = toDestructionPath(authorization);
  const evidenceState = toEvidenceState(authorizationScore);

  const signals: SpatialCuratedDeckDestructionAuthorizationSignal[] = [
    {
      id: "purge-ready",
      label: "purge readiness is purge-ready",
      strength: "high",
      active: purge.purgePosture === "purge-ready",
    },
    {
      id: "purge-review",
      label: "purge readiness is under review",
      strength: "medium",
      active: purge.purgePosture === "review",
    },
    {
      id: "expiry-ready",
      label: "expiry governance is expire-ready",
      strength: "high",
      active: expiry.expiryPosture === "expire-ready",
    },
    {
      id: "expiry-review",
      label: "expiry governance is still review-bound",
      strength: "medium",
      active: expiry.expiryPosture === "review",
    },
    {
      id: "archive-lane",
      label: "archive disposition is archive",
      strength: "high",
      active: archiveDisposition.disposition === "archive",
    },
    {
      id: "archive-requeue",
      label: "archive disposition is requeue",
      strength: "medium",
      active: archiveDisposition.disposition === "requeue",
    },
  ];

  const checks: SpatialCuratedDeckDestructionAuthorizationCheck[] = [
    {
      id: "purge-eligible",
      label: "purge readiness is eligible or conditional",
      status:
        purge.deletionEligibility === "eligible"
          ? "passed"
          : purge.deletionEligibility === "conditional"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "cold-storage-safe",
      label: "cold-storage safety gate is satisfied",
      status: purge.coldStorageSafe ? "passed" : "blocked",
      required: true,
    },
    {
      id: "expiry-eligible",
      label: "expiry governance allows cold-storage path",
      status:
        expiry.coldStorageEligible
          ? "passed"
          : expiry.expiryPosture === "review"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "archive-confirmed",
      label: "archive disposition confirms archive lane",
      status:
        archiveDisposition.disposition === "archive"
          ? "passed"
          : archiveDisposition.disposition === "requeue"
            ? "pending"
            : "blocked",
      required: true,
    },
  ];

  const activeSignalCount = signals.filter((signal) => signal.active).length;
  const requiredCheckCount = checks.filter(
    (check) => check.required && check.status !== "passed",
  ).length;

  const operatorText = toOperatorText({
    authorization,
    destructionPath,
    evidenceState,
  });

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-destruction-authorization.v1",
    activeEntryId: purge.activeEntryId,
    totalEntries: input.entries.length,
    authorizationScore,
    authorization,
    destructionPath,
    evidenceState,
    operatorText,
    activeSignalCount,
    requiredCheckCount,
    signals,
    checks,
    summaryText: parts.join(" · "),
  };
}
