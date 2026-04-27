import { buildSpatialCuratedDeckServiceWindow } from "@/spatial/curation/buildSpatialCuratedDeckServiceWindow";
import { buildSpatialCuratedDeckSla } from "@/spatial/curation/buildSpatialCuratedDeckSla";
import { buildSpatialCuratedDeckVerdict } from "@/spatial/curation/buildSpatialCuratedDeckVerdict";
import type {
  SpatialCuratedDeckBreachWatchMitigation,
  SpatialCuratedDeckBreachWatchSummary,
  SpatialCuratedDeckBreachWatchTrigger,
} from "@/spatial/curation/spatialCuratedDeckBreachWatchTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toWatchBand(score: number): "clear" | "watch" | "breach-risk" {
  if (score <= 29) {
    return "clear";
  }

  if (score <= 59) {
    return "watch";
  }

  return "breach-risk";
}

function toLikelihood(score: number): "low" | "elevated" | "high" {
  if (score <= 29) {
    return "low";
  }

  if (score <= 59) {
    return "elevated";
  }

  return "high";
}

function toOperatorText(input: {
  watchBand: "clear" | "watch" | "breach-risk";
  breachLikelihood: "low" | "elevated" | "high";
}) {
}

export function buildSpatialCuratedDeckBreachWatch(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckBreachWatchSummary {
  const sla = buildSpatialCuratedDeckSla(input);
  const serviceWindow = buildSpatialCuratedDeckServiceWindow(input);
  const verdict = buildSpatialCuratedDeckVerdict(input);

  const triggers: SpatialCuratedDeckBreachWatchTrigger[] = [
    {
      id: "sla-at-risk",
      label: "SLA breach risk is at-risk",
      severity: "high",
      active: sla.breachRisk === "at-risk",
    },
    {
      id: "sla-watch",
      label: "SLA breach risk is watch",
      severity: "medium",
      active: sla.breachRisk === "watch",
    },
    {
      id: "service-hot",
      label: "service window remains hot",
      severity: "high",
      active: serviceWindow.serviceClass === "hot",
    },
    {
      id: "service-warm",
      label: "service window remains warm",
      severity: "medium",
      active: serviceWindow.serviceClass === "warm",
    },
    {
      id: "verdict-investigate",
      label: "verdict still points to investigation",
      severity: "high",
      active: verdict.verdictBand === "investigate",
    },
    {
      id: "verdict-monitor",
      label: "verdict still points to monitoring",
      severity: "medium",
      active: verdict.verdictBand === "monitor",
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

  const breachWatchScore = clamp(
    Math.round(
      sla.slaScore * 0.45 +
      serviceWindow.serviceScore * 0.30 +
      verdict.verdictScore * 0.25 +
      triggerScore * 0.20,
    ),
    0,
    100,
  );

  const watchBand = toWatchBand(breachWatchScore);
  const breachLikelihood = toLikelihood(breachWatchScore);
  const operatorText = toOperatorText({
    watchBand,
    breachLikelihood,
  });

  const mitigations: SpatialCuratedDeckBreachWatchMitigation[] = [
    {
      id: "confirm-response-target",
      label: "confirm response target against service window",
      urgency: breachWatchScore >= 60 ? "now" : breachWatchScore >= 30 ? "soon" : "later",
      required: true,
    },
    {
      id: "run-owner-check",
      label: "run owner-lane check against queue and dispatch surfaces",
      urgency: breachWatchScore >= 60 ? "now" : "soon",
      required: activeTriggers.length > 0,
    },
    {
      id: "promote-inspection",
      label: "promote to inspection if breach-risk persists",
      urgency: "now",
      required: watchBand === "breach-risk",
    },
    {
      id: "refresh-watch",
      label: "refresh watch state on next schedule cycle",
      urgency: watchBand === "clear" ? "later" : "soon",
      required: true,
    },
  ];

  const requiredMitigations = mitigations.filter((item) => item.required);

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-breach-watch.v1",
    activeEntryId: sla.activeEntryId,
    totalEntries: input.entries.length,
    breachWatchScore,
    watchBand,
    breachLikelihood,
    operatorText,
    activeTriggerCount: activeTriggers.length,
    requiredMitigationCount: requiredMitigations.length,
    triggers,
    mitigations,
    summaryText: parts.join(" · "),
  };
}
