import rawReceipt from "@/data/release-receipt.json";

export type EvidenceState =
  | "passed"
  | "failed"
  | "pending"
  | "not-applicable-to-web-release";

export type RouteSourceState = "implemented" | "preview";
export type RouteProductionState = "verified" | "unverified" | "failed";

export type ReleaseRoute = {
  path: string;
  sourceState: RouteSourceState;
  productionState: RouteProductionState;
};

export type ReleaseReceipt = {
  schemaVersion: "urai-release-receipt-1";
  releaseId: string;
  generatedAt: string;
  environment: "production" | "staging" | "preview";
  repository: string;
  canonicalBranch: string;
  productRoot: string;
  firebaseProject: string;
  publicDomain: string;
  candidateSha: string | null;
  testedSha: string | null;
  deployedSha: string | null;
  rollbackSha: string | null;
  manifestSha: string | null;
  assetContract: {
    v1: number;
    v2: number;
    v3: number;
    v4: number;
    v5: number;
    providerPromotionsVerified: string[];
  };
  checks: Record<string, EvidenceState>;
  routes: ReleaseRoute[];
  claimBoundary: string;
};

const isSha = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);

const nullableSha = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  if (!isSha(value)) {
    throw new Error(`Release receipt field ${field} must be null or a 40-character commit SHA.`);
  }
  return value;
};

const validateReceipt = (value: unknown): ReleaseReceipt => {
  if (!value || typeof value !== "object") {
    throw new Error("Release receipt must be an object.");
  }

  const receipt = value as ReleaseReceipt;
  if (receipt.schemaVersion !== "urai-release-receipt-1") {
    throw new Error("Unsupported release receipt schema.");
  }
  if (!Array.isArray(receipt.routes) || receipt.routes.length === 0) {
    throw new Error("Release receipt must contain routes.");
  }

  const routePaths = receipt.routes.map((route) => route.path);
  if (new Set(routePaths).size !== routePaths.length) {
    throw new Error("Release receipt contains duplicate route paths.");
  }

  receipt.candidateSha = nullableSha(receipt.candidateSha, "candidateSha");
  receipt.testedSha = nullableSha(receipt.testedSha, "testedSha");
  receipt.deployedSha = nullableSha(receipt.deployedSha, "deployedSha");
  receipt.rollbackSha = nullableSha(receipt.rollbackSha, "rollbackSha");
  receipt.manifestSha = nullableSha(receipt.manifestSha, "manifestSha");

  if (receipt.deployedSha && receipt.testedSha !== receipt.deployedSha) {
    throw new Error("A deployed SHA must equal the tested SHA.");
  }
  if (receipt.deployedSha && !receipt.rollbackSha) {
    throw new Error("A deployed release must record a rollback SHA.");
  }

  return receipt;
};

export const releaseReceipt = validateReceipt(structuredClone(rawReceipt));

export const isProductionCertified = (receipt: ReleaseReceipt): boolean =>
  Boolean(
    receipt.testedSha &&
      receipt.deployedSha &&
      receipt.rollbackSha &&
      receipt.testedSha === receipt.deployedSha &&
      receipt.routes.every((route) => route.productionState === "verified") &&
      Object.entries(receipt.checks)
        .filter(([name]) => name !== "physicalXr")
        .every(([, state]) => state === "passed")
  );
