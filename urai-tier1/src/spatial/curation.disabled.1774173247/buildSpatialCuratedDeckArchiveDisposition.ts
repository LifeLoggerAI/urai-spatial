import { buildSpatialCuratedDeckClosureCertificate } from "@/spatial/curation/buildSpatialCuratedDeckClosureCertificate";
import { buildSpatialCuratedDeckIncidentResponse } from "@/spatial/curation/buildSpatialCuratedDeckIncidentResponse";
import { buildSpatialCuratedDeckRecoveryGate } from "@/spatial/curation/buildSpatialCuratedDeckRecoveryGate";
import type {
  SpatialCuratedDeckArchiveDispositionSignal,
  SpatialCuratedDeckArchiveDispositionSummary,
} from "@/spatial/curation/spatialCuratedDeckArchiveDispositionTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toDisposition(score: number): "hold" | "requeue" | "archive" {
  if (score <= 29) {
    return "hold";
  }

  if (score <= 69) {
    return "requeue";
  }

  return "archive";
}

function toRetentionLane(
  disposition: "hold" | "requeue" | "archive",
): "active-watch" | "review-hold" | "archive-ready" {
  switch (disposition) {
    case "hold":
      return "active-watch";
    case "requeue":
      return "review-hold";
    case "archive":
      return "archive-ready";
    default:
      return "active-watch";
  }
}

function toReopenRisk(score: number): "low" | "medium" | "high" {
  if (score <= 29) {
    return "high";
  }

  if (score <= 69) {
    return "medium";
  }

  return "low";
}

function toOperatorText(input: {
  disposition: "hold" | "requeue" | "archive";
  retentionLane: "active-watch" | "review-hold" | "archive-ready";
  reopenRisk: "low" | "medium" | "high";
}) {
  return `Run ${input.disposition} disposition · lane ${input.retentionLane} · reopen risk ${input.reopenRisk}.`;
}

export function buildSpatialCuratedDeckArchiveDisposition(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckArchiveDispositionSummary {
  const certificate = buildSpatialCuratedDeckClosureCertificate(input);
  const recoveryGate = buildSpatialCuratedDeckRecoveryGate(input);
  const incident = buildSpatialCuratedDeckIncidentResponse(input);

  const signals: SpatialCuratedDeckArchiveDispositionSignal[] = [
    {
      id: "certificate-issued",
      label: "closure certificate issued",
      level: "high",
      active: certificate.certificateState === "issued",
    },
    {
      id: "certificate-provisional",
      label: "closure certificate provisional",
      level: "medium",
      active: certificate.certificateState === "provisional",
    },
    {
      id: "gate-ready",
      label: "recovery gate ready for exit",
      level: "high",
      active: recoveryGate.exitReadiness === "ready",
    },
    {
      id: "gate-partial",
      label: "recovery gate only partially ready",
      level: "medium",
      active: recoveryGate.exitReadiness === "partial",
    },
    {
      id: "incident-none",
      label: "incident response fully cleared",
      level: "high",
      active: incident.incidentBand === "none",
    },
    {
      id: "incident-advisory",
      label: "incident response still advisory",
      level: "medium",
      active: incident.incidentBand === "advisory",
    },
  ];

  let dispositionScore = 0;
  dispositionScore += Math.round(certificate.closureScore * 0.55);
  dispositionScore += Math.round(recoveryGate.gateScore * 0.30);
  dispositionScore += Math.round((100 - incident.incidentScore) * 0.15);
  dispositionScore = clamp(dispositionScore, 0, 100);

  const disposition = toDisposition(dispositionScore);
  const retentionLane = toRetentionLane(disposition);
  const reopenRisk = toReopenRisk(dispositionScore);
  const operatorText = toOperatorText({
    disposition,
    retentionLane,
    reopenRisk,
  });

  const activeSignalCount = signals.filter((signal) => signal.active).length;

  const parts = [
    `disposition ${dispositionScore}`,
    `decision ${disposition}`,
    `lane ${retentionLane}`,
    `reopen ${reopenRisk}`,
    `certificate ${certificate.certificateState}`,
    `gate ${recoveryGate.exitReadiness}`,
    `incident ${incident.incidentBand}`,
    `signals ${activeSignalCount}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-archive-disposition.v1",
    activeEntryId: certificate.activeEntryId,
    totalEntries: input.entries.length,
    dispositionScore,
    disposition,
    retentionLane,
    reopenRisk,
    operatorText,
    activeSignalCount,
    signals,
    summaryText: parts.join(" · "),
  };
}
