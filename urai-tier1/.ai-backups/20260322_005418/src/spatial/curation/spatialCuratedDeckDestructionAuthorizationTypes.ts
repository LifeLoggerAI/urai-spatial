export type SpatialCuratedDeckDestructionAuthorizationSignal = {
  id: string;
  label: string;
  strength: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckDestructionAuthorizationCheck = {
  id: string;
  label: string;
  status: "blocked" | "pending" | "passed";
  required: boolean;
};

export type SpatialCuratedDeckDestructionAuthorizationSummary = {
  schema: "urai.spatial.curated-deck-destruction-authorization.v1";
  activeEntryId: string | null;
  totalEntries: number;
  authorizationScore: number;
  authorization: "deny" | "review" | "authorize";
  destructionPath: "retain" | "guarded-destruction" | "destroy-candidate";
  evidenceState: "insufficient" | "partial" | "sufficient";
  operatorText: string;
  activeSignalCount: number;
  requiredCheckCount: number;
  signals: SpatialCuratedDeckDestructionAuthorizationSignal[];
  checks: SpatialCuratedDeckDestructionAuthorizationCheck[];
  summaryText: string;
};

