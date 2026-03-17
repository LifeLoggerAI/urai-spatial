export type SpatialCuratedDeckClosureCertificateBlocker = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckClosureCertificateCheck = {
  id: string;
  label: string;
  status: "blocked" | "pending" | "passed";
  required: boolean;
};

export type SpatialCuratedDeckClosureCertificateSummary = {
  schema: "urai.spatial.curated-deck-closure-certificate.v1";
  activeEntryId: string | null;
  totalEntries: number;
  closureScore: number;
  closureDecision: "hold" | "review" | "close";
  certificateState: "not-ready" | "provisional" | "issued";
  operatorText: string;
  activeBlockerCount: number;
  requiredCheckCount: number;
  blockers: SpatialCuratedDeckClosureCertificateBlocker[];
  checks: SpatialCuratedDeckClosureCertificateCheck[];
  summaryText: string;
};
