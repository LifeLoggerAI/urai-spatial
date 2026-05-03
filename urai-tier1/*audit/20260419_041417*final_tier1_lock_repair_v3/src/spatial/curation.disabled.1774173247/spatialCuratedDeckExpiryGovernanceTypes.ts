export type SpatialCuratedDeckExpiryGovernanceStatus =
  | "active"
  | "review"
  | "expired"
  | "blocked";

export type SpatialCuratedDeckExpiryGovernanceCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type SpatialCuratedDeckExpiryGovernanceEntry = {
  entryId: string;
  title: string;
  ageDays: number;
  expiresInDays: number;
  status: SpatialCuratedDeckExpiryGovernanceStatus;
  checks: SpatialCuratedDeckExpiryGovernanceCheck[];
};

export type SpatialCuratedDeckExpiryGovernanceSummary = {
  schema: "urai.spatial.curated-deck-expiry-governance.v1";
  generatedAt: string;
  totalEntries: number;
  activeEntryId: string | null;
  activeStatus: SpatialCuratedDeckExpiryGovernanceStatus | null;
  expiryScore: number;
  expiryPosture: string;
  coldStorageEligible: boolean;
  statusCounts: Record<SpatialCuratedDeckExpiryGovernanceStatus, number>;
  entries: SpatialCuratedDeckExpiryGovernanceEntry[];
};
