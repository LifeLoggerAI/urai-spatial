import { buildSpatialCuratedDeckBreachWatch } from "@/spatial/curation/buildSpatialCuratedDeckBreachWatch";
import { buildSpatialCuratedDeckDispatch } from "@/spatial/curation/buildSpatialCuratedDeckDispatch";
import { buildSpatialCuratedDeckSla } from "@/spatial/curation/buildSpatialCuratedDeckSla";
import type {
  SpatialCuratedDeckIncidentResponseStep,
  SpatialCuratedDeckIncidentResponseSummary,
  SpatialCuratedDeckIncidentResponseTrigger,
} from "@/spatial/curation/spatialCuratedDeckIncidentResponseTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toIncidentBand(score: number): "none" | "advisory" | "incident" {
  if (score <= 29) {
    return "none";
  }

  if (score <= 59) {
    return "advisory";
  }

  return "incident";
}

function toResponseMode(
  band: "none" | "advisory" | "incident",
): "observe" | "contain" | "escalate" {
  switch (band) {
    case "none":
      return "observe";
    case "advisory":
      return "contain";
    case "incident":
      return "escalate";
    default:
      return "observe";
  }
}

function toPlaybook(
  mode: "observe" | "contain" | "escalate",
): "passive-watch" | "review-containment" | "incident-escalation" {
  switch (mode) {
    case "observe":
      return "passive-watch";
    case "contain":
      return "review-containment";
    case "escalate":
      return "incident-escalation";
    default:
      return "passive-watch";
  }
}

function toOperatorText(input: {
  incidentBand: "none" | "advisory" | "incident";
  responseMode: "observe" | "contain" | "escalate";
  playbook: "passive-watch" | "review-containment" | "incident-escalation";
}) {
  return `Run ${input.incidentBand} response · mode ${input.responseMode} · playbook ${input.playbook}.`;
}

export function buildSpatialCuratedDeckIncidentResponse(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckIncidentResponseSummary {
  const breachWatch = buildSpatialCuratedDeckBreachWatch(input);
  const sla = buildSpatialCuratedDeckSla(input);
  const dispatch = buildSpatialCuratedDeckDispatch(input);

  const triggers: SpatialCuratedDeckIncidentResponseTrigger[] = [
    {
      id: "breach-risk",
      label: "breach watch is in breach-risk band",
      severity: "high",
      active: breachWatch.watchBand === "breach-risk",
    },
    {
      id: "breach-watch",
      label: "breach watch remains active",
      severity: "medium",
      active: breachWatch.watchBand === "watch",
    },
    {
      id: "sla-at-risk",
      label: "SLA remains at-risk",
      severity: "high",
      active: sla.breachRisk === "at-risk",
    },
    {
      id: "sla-watch",
      label: "SLA remains on watch",
      severity: "medium",
      active: sla.breachRisk === "watch",
    },
    {
      id: "dispatch-inspect",
      label: "dispatch owner is in inspection lane",
      severity: "high",
      active: dispatch.dispatchLane === "inspect",
    },
    {
      id: "dispatch-review",
      label: "dispatch owner is in review lane",
      severity: "medium",
      active: dispatch.dispatchLane === "review",
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

  const incidentScore = clamp(
    Math.round(
      breachWatch.breachWatchScore * 0.45 +
      sla.slaScore * 0.30 +
      dispatch.dispatchScore * 0.25 +
      triggerScore * 0.20,
    ),
    0,
    100,
  );

  const incidentBand = toIncidentBand(incidentScore);
  const responseMode = toResponseMode(incidentBand);
  const playbook = toPlaybook(responseMode);
  const operatorText = toOperatorText({
    incidentBand,
    responseMode,
    playbook,
  });

  const steps: SpatialCuratedDeckIncidentResponseStep[] = [
    {
      id: "confirm-band",
      label: "confirm incident band against SLA and breach-watch surfaces",
      timing: incidentBand === "incident" ? "now" : incidentBand === "advisory" ? "soon" : "later",
      required: true,
    },
    {
      id: "contain-review-lane",
      label: "contain through review lane before promoting deeper action",
      timing: incidentBand === "incident" ? "now" : "soon",
      required: responseMode !== "observe",
    },
    {
      id: "escalate-playbook",
      label: "execute escalation playbook if incident band persists",
      timing: "now",
      required: responseMode === "escalate",
    },
    {
      id: "refresh-watch",
      label: "refresh passive watch state on next cycle",
      timing: responseMode === "observe" ? "later" : "soon",
      required: true,
    },
  ];

  const requiredSteps = steps.filter((step) => step.required);

  const parts = [
    `incident ${incidentScore}`,
    `band ${incidentBand}`,
    `mode ${responseMode}`,
    `playbook ${playbook}`,
    `triggers ${activeTriggers.length}`,
    `steps ${requiredSteps.length}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-incident-response.v1",
    activeEntryId: breachWatch.activeEntryId,
    totalEntries: input.entries.length,
    incidentScore,
    incidentBand,
    responseMode,
    playbook,
    operatorText,
    activeTriggerCount: activeTriggers.length,
    requiredStepCount: requiredSteps.length,
    triggers,
    steps,
    summaryText: parts.join(" · "),
  };
}
