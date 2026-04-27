export type SpatialCuratedDeckPurgeReadinessCheck = {
  id: string;
  label: string;
  status: "blocked" | "pending" | "passed";
  required: boolean;
};

export type SpatialCuratedDeckPurgeReadinessSummary = {
  schema: "urai.spatial.curated-deck-purge-readiness.v1";
  activeEntryId: string | null;
  totalEntries: number;
  purgeScore: number;
  purgePosture: "keep" | "review" | "purge-ready";
  deletionEligibility: "blocked" | "conditional" | "eligible";
  coldStorageSafe: boolean;
  operatorText: string;
  requiredCheckCount: number;
  checks: SpatialCuratedDeckPurgeReadinessCheck[];
  summaryText: string;
};
