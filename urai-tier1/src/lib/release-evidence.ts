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

export type EvidenceArtifact = {
  path: string;
  sha256: string;
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
  evidenceArtifacts: Record<string, EvidenceArtifact>;
  checks: Record<string, EvidenceState>;
  routes: ReleaseRoute[];
  claimBoundary: string;
};

export const requiredCoreEvidenceArtifacts = [
  "canonicalContract",
  "routeContract",
  "runtimeCompile",
  "runtimeSmoke",
  "productTypecheck",
  "productBuild",
] as const;

export const requiredReleaseEvidenceArtifacts = [
  "browserFlow",
  "mobileFlow",
  "accessibility",
  "customDomain",
  "rollback",
] as const;

export const requiredNonXrChecks = [
  "canonicalContract",
  "runtimeCompile",
  "runtimeSmoke",
  "productTypecheck",
  "productBuild",
  "browserFlow",
  "mobileFlow",
  "accessibility",
  "customDomain",
  "rollback",
] as const;

export const requiredCheckNames = [
  ...requiredNonXrChecks,
  "physicalXr",
] as const;

const expectedAssetCounts = {
  v1: 53,
  v2: 80,
  v3: 14,
  v4: 39,
  v5: 27,
} as const;

const isCommitSha = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);

const isSha256 = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);

const nullableCommitSha = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  if (!isCommitSha(value)) {
    throw new Error(
      `Release receipt field ${field} must be null or a 40-character Git commit SHA.`,
    );
  }
  return value;
};

const nullableManifestSha = (value: unknown): string | null => {
  if (value === null) return null;
  if (!isSha256(value)) {
    throw new Error(
      "Release receipt field manifestSha must be null or a 64-character SHA-256 digest.",
    );
  }
  return value;
};

const validEvidenceStates = new Set<EvidenceState>([
  "passed",
  "failed",
  "pending",
  "not-applicable-to-web-release",
]);

const hasArtifacts = (
  receipt: ReleaseReceipt,
  names: readonly string[],
): boolean => names.every((name) => Boolean(receipt.evidenceArtifacts[name]));

const nonXrChecksPassed = (receipt: ReleaseReceipt): boolean =>
  requiredNonXrChecks.every((name) => receipt.checks[name] === "passed");

const certificationFieldsComplete = (receipt: ReleaseReceipt): boolean =>
  Boolean(
    receipt.candidateSha &&
      receipt.testedSha &&
      receipt.deployedSha &&
      receipt.rollbackSha &&
      receipt.manifestSha &&
      receipt.candidateSha === receipt.testedSha &&
      receipt.testedSha === receipt.deployedSha &&
      nonXrChecksPassed(receipt) &&
      hasArtifacts(receipt, requiredCoreEvidenceArtifacts) &&
      hasArtifacts(receipt, requiredReleaseEvidenceArtifacts),
  );

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
  for (const route of receipt.routes) {
    if (!route.path.startsWith("/")) {
      throw new Error(`Invalid release route path: ${route.path}`);
    }
    if (!["implemented", "preview"].includes(route.sourceState)) {
      throw new Error(`Invalid source state for ${route.path}.`);
    }
    if (!["verified", "unverified", "failed"].includes(route.productionState)) {
      throw new Error(`Invalid production state for ${route.path}.`);
    }
  }

  if (!receipt.checks || typeof receipt.checks !== "object") {
    throw new Error("Release receipt checks must be an object.");
  }
  for (const name of requiredCheckNames) {
    if (!(name in receipt.checks)) {
      throw new Error(`Release receipt is missing required check ${name}.`);
    }
  }
  for (const [name, state] of Object.entries(receipt.checks)) {
    if (!validEvidenceStates.has(state)) {
      throw new Error(`Invalid evidence state for ${name}: ${state}`);
    }
  }

  if (!receipt.evidenceArtifacts || typeof receipt.evidenceArtifacts !== "object") {
    throw new Error("Release receipt evidenceArtifacts must be an object.");
  }
  for (const [name, artifact] of Object.entries(receipt.evidenceArtifacts)) {
    if (!artifact || typeof artifact !== "object") {
      throw new Error(`Evidence artifact ${name} must be an object.`);
    }
    if (typeof artifact.path !== "string" || !artifact.path.trim()) {
      throw new Error(`Evidence artifact ${name} must record a path.`);
    }
    if (!isSha256(artifact.sha256)) {
      throw new Error(`Evidence artifact ${name} must record a SHA-256 digest.`);
    }
  }

  receipt.candidateSha = nullableCommitSha(receipt.candidateSha, "candidateSha");
  receipt.testedSha = nullableCommitSha(receipt.testedSha, "testedSha");
  receipt.deployedSha = nullableCommitSha(receipt.deployedSha, "deployedSha");
  receipt.rollbackSha = nullableCommitSha(receipt.rollbackSha, "rollbackSha");
  receipt.manifestSha = nullableManifestSha(receipt.manifestSha);

  for (const [version, expected] of Object.entries(expectedAssetCounts)) {
    if (receipt.assetContract?.[version as keyof typeof expectedAssetCounts] !== expected) {
      throw new Error(`Release receipt asset contract ${version} must equal ${expected}.`);
    }
  }
  if (!Array.isArray(receipt.assetContract.providerPromotionsVerified)) {
    throw new Error(
      "Release receipt providerPromotionsVerified must be an array.",
    );
  }

  if (receipt.deployedSha && receipt.testedSha !== receipt.deployedSha) {
    throw new Error("A deployed SHA must equal the tested SHA.");
  }
  if (receipt.deployedSha && receipt.candidateSha !== receipt.deployedSha) {
    throw new Error("A deployed SHA must equal the candidate SHA.");
  }
  if (receipt.deployedSha && !receipt.rollbackSha) {
    throw new Error("A deployed release must record a rollback SHA.");
  }
  if (receipt.deployedSha && !receipt.manifestSha) {
    throw new Error("A deployed release must record a manifest SHA-256 digest.");
  }
  if (receipt.deployedSha && !hasArtifacts(receipt, requiredCoreEvidenceArtifacts)) {
    throw new Error(
      "A deployed release must include hashed canonical, route, runtime, typecheck, and build evidence artifacts.",
    );
  }

  const allRoutesVerified = receipt.routes.every(
    (route) => route.productionState === "verified",
  );
  if (allRoutesVerified !== certificationFieldsComplete(receipt)) {
    throw new Error(
      "Verified routes require matching candidate, tested and deployed SHAs, rollback and manifest SHAs, passed checks, and all required hashed evidence artifacts.",
    );
  }

  return receipt;
};

export const releaseReceipt = validateReceipt(structuredClone(rawReceipt));

export const isProductionCertified = (receipt: ReleaseReceipt): boolean =>
  receipt.routes.every((route) => route.productionState === "verified") &&
  certificationFieldsComplete(receipt);
