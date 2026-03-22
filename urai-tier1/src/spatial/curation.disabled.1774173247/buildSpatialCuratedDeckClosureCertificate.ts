import { buildSpatialCuratedDeckIncidentResponse } from "@/spatial/curation/buildSpatialCuratedDeckIncidentResponse";
import { buildSpatialCuratedDeckRecoveryGate } from "@/spatial/curation/buildSpatialCuratedDeckRecoveryGate";
import { buildSpatialCuratedDeckServiceWindow } from "@/spatial/curation/buildSpatialCuratedDeckServiceWindow";
import type {
  SpatialCuratedDeckClosureCertificateBlocker,
  SpatialCuratedDeckClosureCertificateCheck,
  SpatialCuratedDeckClosureCertificateSummary,
} from "@/spatial/curation/spatialCuratedDeckClosureCertificateTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toDecision(score: number): "hold" | "review" | "close" {
  if (score <= 29) {
    return "hold";
  }

  if (score <= 69) {
    return "review";
  }

  return "close";
}

function toCertificateState(score: number): "not-ready" | "provisional" | "issued" {
  if (score <= 29) {
    return "not-ready";
  }

  if (score <= 69) {
    return "provisional";
  }

  return "issued";
}

function toOperatorText(input: {
  closureDecision: "hold" | "review" | "close";
  certificateState: "not-ready" | "provisional" | "issued";
}) {
  return `Run ${input.closureDecision} decision · certificate ${input.certificateState}.`;
}

export function buildSpatialCuratedDeckClosureCertificate(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckClosureCertificateSummary {
  const recoveryGate = buildSpatialCuratedDeckRecoveryGate(input);
  const incident = buildSpatialCuratedDeckIncidentResponse(input);
  const serviceWindow = buildSpatialCuratedDeckServiceWindow(input);

  let closureScore = 0;
  closureScore += Math.round(recoveryGate.gateScore * 0.55);
  closureScore += Math.round((100 - incident.incidentScore) * 0.25);
  closureScore += Math.round((100 - serviceWindow.serviceScore) * 0.20);
  closureScore = clamp(closureScore, 0, 100);

  const closureDecision = toDecision(closureScore);
  const certificateState = toCertificateState(closureScore);
  const operatorText = toOperatorText({
    closureDecision,
    certificateState,
  });

  const blockers: SpatialCuratedDeckClosureCertificateBlocker[] = [
    {
      id: "incident-open",
      label: "incident response remains above none",
      severity: "high",
      active: incident.incidentBand !== "none",
    },
    {
      id: "recovery-not-ready",
      label: "recovery gate is not fully ready",
      severity: recoveryGate.exitReadiness === "blocked" ? "high" : "medium",
      active: recoveryGate.exitReadiness !== "ready",
    },
    {
      id: "service-hot",
      label: "service window is still warm or hot",
      severity: serviceWindow.serviceClass === "hot" ? "high" : "medium",
      active: serviceWindow.serviceClass !== "cold",
    },
  ];

  const checks: SpatialCuratedDeckClosureCertificateCheck[] = [
    {
      id: "gate-cleared",
      label: "recovery gate cleared",
      status:
        recoveryGate.exitReadiness === "ready"
          ? "passed"
          : recoveryGate.exitReadiness === "partial"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "incident-cleared",
      label: "incident response below advisory",
      status:
        incident.incidentBand === "none"
          ? "passed"
          : incident.incidentBand === "advisory"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "service-cooled",
      label: "service window cooled to cold",
      status:
        serviceWindow.serviceClass === "cold"
          ? "passed"
          : serviceWindow.serviceClass === "warm"
            ? "pending"
            : "blocked",
      required: true,
    },
    {
      id: "operator-close-pass",
      label: "operator executes final close pass",
      status:
        closureDecision === "close"
          ? "passed"
          : closureDecision === "review"
            ? "pending"
            : "blocked",
      required: true,
    },
  ];

  const activeBlockerCount = blockers.filter((blocker) => blocker.active).length;
  const requiredCheckCount = checks.filter(
    (check) => check.required && check.status !== "passed",
  ).length;

  const parts = [
    `closure ${closureScore}`,
    `decision ${closureDecision}`,
    `certificate ${certificateState}`,
    `blockers ${activeBlockerCount}`,
    `checks ${requiredCheckCount}`,
    `gate ${recoveryGate.exitReadiness}`,
    `incident ${incident.incidentBand}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-closure-certificate.v1",
    activeEntryId: recoveryGate.activeEntryId,
    totalEntries: input.entries.length,
    closureScore,
    closureDecision,
    certificateState,
    operatorText,
    activeBlockerCount,
    requiredCheckCount,
    blockers,
    checks,
    summaryText: parts.join(" · "),
  };
}
