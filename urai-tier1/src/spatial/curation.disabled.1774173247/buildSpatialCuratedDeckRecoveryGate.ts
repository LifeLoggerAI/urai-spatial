import { buildSpatialCuratedDeckBreachWatch } from "@/spatial/curation/buildSpatialCuratedDeckBreachWatch";
import { buildSpatialCuratedDeckIncidentResponse } from "@/spatial/curation/buildSpatialCuratedDeckIncidentResponse";
import { buildSpatialCuratedDeckSla } from "@/spatial/curation/buildSpatialCuratedDeckSla";
import type {
  SpatialCuratedDeckRecoveryGateCondition,
  SpatialCuratedDeckRecoveryGateSummary,
} from "@/spatial/curation/spatialCuratedDeckRecoveryGateTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toRecoveryState(score: number): "open" | "stabilizing" | "cleared" {
  if (score <= 29) {
    return "open";
  }

  if (score <= 69) {
    return "stabilizing";
  }

  return "cleared";
}

function toExitReadiness(score: number): "blocked" | "partial" | "ready" {
  if (score <= 29) {
    return "blocked";
  }

  if (score <= 69) {
    return "partial";
  }

  return "ready";
}

function toOperatorText(input: {
  recoveryState: "open" | "stabilizing" | "cleared";
  exitReadiness: "blocked" | "partial" | "ready";
}) {
  return `Run ${input.recoveryState} recovery gate · exit ${input.exitReadiness}.`;
}

export function buildSpatialCuratedDeckRecoveryGate(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckRecoveryGateSummary {
  const incident = buildSpatialCuratedDeckIncidentResponse(input);
  const breachWatch = buildSpatialCuratedDeckBreachWatch(input);
  const sla = buildSpatialCuratedDeckSla(input);

  let gateScore = 100;

  if (incident.incidentBand === "incident") {
    gateScore -= 45;
  } else if (incident.incidentBand === "advisory") {
    gateScore -= 22;
  }

  if (breachWatch.watchBand === "breach-risk") {
    gateScore -= 28;
  } else if (breachWatch.watchBand === "watch") {
    gateScore -= 14;
  }

  if (sla.breachRisk === "at-risk") {
    gateScore -= 18;
  } else if (sla.breachRisk === "watch") {
    gateScore -= 9;
  }

  gateScore = clamp(Math.round(gateScore), 0, 100)

  const recoveryState = toRecoveryState(gateScore);
  const exitReadiness = toExitReadiness(gateScore);
  const operatorText = toOperatorText({
    recoveryState,
    exitReadiness,
  });

  const conditions: SpatialCuratedDeckRecoveryGateCondition[] = [
    {
      id: "incident-clear",
      label: "incident band is below incident",
      status:
        incident.incidentBand === "incident"
          ? "open"
          : incident.incidentBand === "advisory"
            ? "tracking"
            : "satisfied",
      required: true,
    },
    {
      id: "breach-clear",
      label: "breach watch is no worse than watch",
      status:
        breachWatch.watchBand === "breach-risk"
          ? "open"
          : breachWatch.watchBand === "watch"
            ? "tracking"
            : "satisfied",
      required: true,
    },
    {
      id: "sla-clear",
      label: "SLA risk is trending clear",
      status:
        sla.breachRisk === "at-risk"
          ? "open"
          : sla.breachRisk === "watch"
            ? "tracking"
            : "satisfied",
      required: true,
    },
    {
      id: "operator-review",
      label: "operator rechecks next closure pass",
      status: recoveryState === "cleared" ? "satisfied" : "tracking",
      required: true,
    },
  ];

  const activeConditionCount = conditions.filter(
    (condition) => condition.required && condition.status !== "satisfied",
  ).length;

  const parts = [
    `gate ${gateScore}`,
    `state ${recoveryState}`,
    `exit ${exitReadiness}`,
    `incident ${incident.incidentBand}`,
    `breach ${breachWatch.watchBand}`,
    `sla ${sla.breachRisk}`,
    `conditions ${activeConditionCount}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-recovery-gate.v1",
    activeEntryId: incident.activeEntryId,
    totalEntries: input.entries.length,
    gateScore,
    recoveryState,
    exitReadiness,
    operatorText,
    activeConditionCount,
    conditions,
    summaryText: parts.join(" · "),
  };
}
