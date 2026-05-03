export type SpatialCuratedDeckDestructionExecutionGateSignal = {
  id: string;
  label: string;
  strength: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckDestructionExecutionGateCheck = {
  id: string;
  label: string;
  status: "blocked" | "pending" | "passed";
  required: boolean;
};

export type SpatialCuratedDeckDestructionExecutionGateSummary = {
  schema: "urai.spatial.curated-deck-destruction-execution-gate.v1";
  activeEntryId: string | null;
  totalEntries: number;
  authorizationScore: number;
  authorization: "deny" | "review" | "authorize";
  destructionPath: "retain" | "guarded-destruction" | "destroy-candidate";
  evidenceState: "insufficient" | "partial" | "sufficient";
  operatorText: string;
  activeSignalCount: number;
  requiredCheckCount: number;
  signals: SpatialCuratedDeckDestructionExecutionGateSignal[];
  checks: SpatialCuratedDeckDestructionExecutionGateCheck[];
  summaryText: string;
};
