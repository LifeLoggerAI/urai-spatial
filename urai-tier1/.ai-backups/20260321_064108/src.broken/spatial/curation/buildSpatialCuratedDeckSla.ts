import { buildSpatialCuratedDeckQueue } from "@/spatial/curation/buildSpatialCuratedDeckQueue";
import { buildSpatialCuratedDeckSchedule } from "@/spatial/curation/buildSpatialCuratedDeckSchedule";
import { buildSpatialCuratedDeckServiceWindow } from "@/spatial/curation/buildSpatialCuratedDeckServiceWindow";
import type {
  SpatialCuratedDeckSlaSignal,
  SpatialCuratedDeckSlaSummary,
} from "@/spatial/curation/spatialCuratedDeckSlaTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toServiceTier(score: number): "standard" | "priority" | "critical" {
  if (score <= 29) {
    return "standard";
  }

  if (score <= 59) {
    return "priority";
  }

  return "critical";
}

function toBreachRisk(score: number): "clear" | "watch" | "at-risk" {
  if (score <= 29) {
    return "clear";
  }

  if (score <= 59) {
    return "watch";
  }

  return "at-risk";
}

function toOperatorText(input: {
  serviceTier: "standard" | "priority" | "critical";
  breachRisk: "clear" | "watch" | "at-risk";
  responseTarget: "24h" | "4h" | "15m";
}) {
  return `Run ${input.serviceTier} SLA · ${input.breachRisk} breach risk · target ${input.responseTarget}.`;
}

export function buildSpatialCuratedDeckSla(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckSlaSummary {
  const serviceWindow = buildSpatialCuratedDeckServiceWindow(input);
  const schedule = buildSpatialCuratedDeckSchedule(input);
  const queue = buildSpatialCuratedDeckQueue(input);

  const signals: SpatialCuratedDeckSlaSignal[] = [
    {
      id: "service-hot",
      label: "service window is hot",
      impact: "high",
      active: serviceWindow.serviceClass === "hot",
    },
    {
      id: "service-warm",
      label: "service window is warm",
      impact: "medium",
      active: serviceWindow.serviceClass === "warm",
    },
    {
      id: "schedule-immediate",
      label: "schedule cadence is immediate",
      impact: "high",
      active: schedule.cadence === "immediate",
    },
    {
      id: "schedule-planned",
      label: "schedule cadence is planned",
      impact: "medium",
      active: schedule.cadence === "planned",
    },
    {
      id: "queue-frontline",
      label: "queue is in frontline position",
      impact: "high",
      active: queue.queueLane === "frontline",
    },
    {
      id: "queue-priority",
      label: "queue is in priority position",
      impact: "medium",
      active: queue.queueLane === "priority",
    },
  ];

  const activeSignals = signals.filter((signal) => signal.active);
  const signalScore = activeSignals.reduce((sum, signal) => {
    if (signal.impact === "high") {
      return sum + 18;
    }
    if (signal.impact === "medium") {
      return sum + 10;
    }
    return sum + 4;
  }, 0);

  const slaScore = clamp(
    Math.round(
      serviceWindow.serviceScore * 0.45 +
      schedule.scheduleScore * 0.30 +
      queue.queueScore * 0.25 +
      signalScore * 0.20,
    ),
    0,
    100,
  );

  const serviceTier = toServiceTier(slaScore);
  const breachRisk = toBreachRisk(slaScore);
  const responseTarget = serviceWindow.responseTarget;
  const nextCheckpointWindow = serviceWindow.deadlineBand;
  const operatorText = toOperatorText({
    serviceTier,
    breachRisk,
    responseTarget,
  });

  const parts = [
    `sla ${slaScore}`,
    `tier ${serviceTier}`,
    `risk ${breachRisk}`,
    `target ${responseTarget}`,
    `checkpoint ${nextCheckpointWindow}`,
    `signals ${activeSignals.length}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-sla.v1",
    activeEntryId: serviceWindow.activeEntryId,
    totalEntries: input.entries.length,
    slaScore,
    serviceTier,
    breachRisk,
    responseTarget,
    nextCheckpointWindow,
    operatorText,
    activeSignalCount: activeSignals.length,
    signals,
    summaryText: parts.join(" · "),
  };
}
