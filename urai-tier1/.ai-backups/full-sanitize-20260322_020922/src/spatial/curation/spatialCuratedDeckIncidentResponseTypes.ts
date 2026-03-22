export type SpatialCuratedDeckIncidentResponseTrigger = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckIncidentResponseStep = {
  id: string;
  label: string;
  timing: "later" | "soon" | "now";
  required: boolean;
};

export type SpatialCuratedDeckIncidentResponseSummary = {
  schema: "urai.spatial.curated-deck-incident-response.v1";
  activeEntryId: string | null;
  totalEntries: number;
  incidentScore: number;
  incidentBand: "none" | "advisory" | "incident";
  responseMode: "observe" | "contain" | "escalate";
  playbook: "passive-watch" | "review-containment" | "incident-escalation";
  operatorText: string;
  activeTriggerCount: number;
  requiredStepCount: number;
  triggers: SpatialCuratedDeckIncidentResponseTrigger[];
  steps: SpatialCuratedDeckIncidentResponseStep[];
  summaryText: string;
};
