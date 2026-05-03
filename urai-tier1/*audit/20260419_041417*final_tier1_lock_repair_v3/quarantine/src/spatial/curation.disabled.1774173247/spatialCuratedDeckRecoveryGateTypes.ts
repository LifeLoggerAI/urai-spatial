export type SpatialCuratedDeckRecoveryGateCondition = {
  id: string;
  label: string;
  status: "open" | "tracking" | "satisfied";
  required: boolean;
};

export type SpatialCuratedDeckRecoveryGateSummary = {
  schema: "urai.spatial.curated-deck-recovery-gate.v1";
  activeEntryId: string | null;
  totalEntries: number;
  gateScore: number;
  recoveryState: "open" | "stabilizing" | "cleared";
  exitReadiness: "blocked" | "partial" | "ready";
  operatorText: string;
  activeConditionCount: number;
  conditions: SpatialCuratedDeckRecoveryGateCondition[];
  summaryText: string;
};
