import { buildSpatialCuratedDeckArchiveDisposition } from "@/spatial/curation/buildSpatialCuratedDeckArchiveDisposition";
import { buildSpatialCuratedDeckBreachWatch } from "@/spatial/curation/buildSpatialCuratedDeckBreachWatch";
import { buildSpatialCuratedDeckClosureCertificate } from "@/spatial/curation/buildSpatialCuratedDeckClosureCertificate";
import type {
  SpatialCuratedDeckReopenWatchSummary,
  SpatialCuratedDeckReopenWatchTrigger,
} from "@/spatial/curation/spatialCuratedDeckReopenWatchTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toReopenState(score: number): "dormant" | "guarded" | "reopen-risk" {
  if (score <= 29) {
    return "dormant";
  }

  if (score <= 59) {
    return "guarded";
  }

  return "reopen-risk";
}

function toWatchMode(
  state: "dormant" | "guarded" | "reopen-risk",
): "passive" | "guarded" | "active" {
  switch (state) {
    case "dormant":
      return "passive";
    case "guarded":
      return "guarded";
    case "reopen-risk":
      return "active";
    default:
      return "passive";
  }
}

function toReentryPath(
  state: "dormant" | "guarded" | "reopen-risk",
): "stay-archived" | "review-return" | "reopen-immediately" {
  switch (state) {
    case "dormant":
      return "stay-archived";
    case "guarded":
      return "review-return";
    case "reopen-risk":
      return "reopen-immediately";
    default:
      return "stay-archived";
  }
}

function toOperatorText(input: {
  reopenState: "dormant" | "guarded" | "reopen-risk";
  watchMode: "passive" | "guarded" | "active";
  reentryPath: "stay-archived" | "review-return" | "reopen-immediately";
}) {
}

export function buildSpatialCuratedDeckReopenWatch(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckReopenWatchSummary {
  const archiveDisposition = buildSpatialCuratedDeckArchiveDisposition(input);
  const certificate = buildSpatialCuratedDeckClosureCertificate(input);
  const breachWatch = buildSpatialCuratedDeckBreachWatch(input);

  const triggers: SpatialCuratedDeckReopenWatchTrigger[] = [
    {
      id: "disposition-hold",
      label: "archive disposition remains hold",
      severity: "high",
      active: archiveDisposition.disposition === "hold",
    },
    {
      id: "disposition-requeue",
      label: "archive disposition remains requeue",
      severity: "medium",
      active: archiveDisposition.disposition === "requeue",
    },
    {
      id: "certificate-not-issued",
      label: "closure certificate is not yet issued",
      severity: certificate.certificateState === "not-ready" ? "high" : "medium",
      active: certificate.certificateState !== "issued",
    },
    {
      id: "breach-risk",
      label: "breach watch remains active",
      severity: breachWatch.watchBand === "breach-risk" ? "high" : "medium",
      active: breachWatch.watchBand !== "clear",
    },
    {
      id: "reopen-risk-high",
      label: "archive reopen risk remains high",
      severity: "high",
      active: archiveDisposition.reopenRisk === "high",
    },
    {
      id: "reopen-risk-medium",
      label: "archive reopen risk remains medium",
      severity: "medium",
      active: archiveDisposition.reopenRisk === "medium",
    },
  ];

  const activeTriggers = triggers.filter((trigger) => trigger.active);
  const triggerScore = activeTriggers.reduce((sum, trigger) => {
    if (trigger.severity === "high") {
      return sum + 18;
    }
    if (trigger.severity === "medium") {
      return sum + 10;
    }
    return sum + 4;
  }, 0);

  const reopenScore = clamp(
    Math.round(
      (100 - archiveDisposition.dispositionScore) * 0.45 +
      (100 - certificate.closureScore) * 0.30 +
      breachWatch.breachWatchScore * 0.25 +
      triggerScore * 0.20,
    ),
    0,
    100,
  );

  const reopenState = toReopenState(reopenScore);
  const watchMode = toWatchMode(reopenState);
  const reentryPath = toReentryPath(reopenState);
  const operatorText = toOperatorText({
    reopenState,
    watchMode,
    reentryPath,
  });

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-reopen-watch.v1",
    activeEntryId: archiveDisposition.activeEntryId,
    totalEntries: input.entries.length,
    reopenScore,
    reopenState,
    watchMode,
    reentryPath,
    operatorText,
    activeTriggerCount: activeTriggers.length,
    triggers,
    summaryText: parts.join(" · "),
  };
}
