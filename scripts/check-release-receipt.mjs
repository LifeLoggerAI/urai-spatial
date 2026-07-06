#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

const receiptPath = path.resolve(
  process.cwd(),
  "urai-tier1/src/data/release-receipt.json"
);

const receipt = JSON.parse(readFileSync(receiptPath, "utf-8"));

const fail = (message) => {
  console.error(`Release receipt validation failed: ${message}`);
  process.exit(1);
};

const isSha256 = (value) =>
  typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);

const nullableCommitSha = (value, name) => {
  if (value === null) return;
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/i.test(value)) {
    fail(`${name} must be null or a 40-character Git commit SHA`);
  }
};

const nullableManifestSha = (value) => {
  if (value === null) return;
  if (!isSha256(value)) {
    fail("manifestSha must be null or a 64-character SHA-256 digest");
  }
};

if (receipt.schemaVersion !== "urai-release-receipt-1") {
  fail("unsupported schemaVersion");
}

for (const field of [
  "releaseId",
  "generatedAt",
  "environment",
  "repository",
  "canonicalBranch",
  "productRoot",
  "firebaseProject",
  "publicDomain",
  "claimBoundary",
]) {
  if (typeof receipt[field] !== "string" || receipt[field].trim() === "") {
    fail(`missing required string field ${field}`);
  }
}

for (const field of ["candidateSha", "testedSha", "deployedSha", "rollbackSha"]) {
  nullableCommitSha(receipt[field], field);
}
nullableManifestSha(receipt.manifestSha);

if (!Array.isArray(receipt.routes) || receipt.routes.length === 0) {
  fail("routes must be a non-empty array");
}

const routePaths = new Set();
for (const route of receipt.routes) {
  if (!route || typeof route !== "object") fail("route entries must be objects");
  if (typeof route.path !== "string" || !route.path.startsWith("/")) {
    fail("each route must have an absolute path");
  }
  if (routePaths.has(route.path)) fail(`duplicate route ${route.path}`);
  routePaths.add(route.path);
  if (!["implemented", "preview"].includes(route.sourceState)) {
    fail(`invalid sourceState for ${route.path}`);
  }
  if (!["verified", "unverified", "failed"].includes(route.productionState)) {
    fail(`invalid productionState for ${route.path}`);
  }
}

for (const route of [
  "/",
  "/home",
  "/ground",
  "/life-map",
  "/focus",
  "/replay",
  "/mirror",
  "/passport",
  "/status",
  "/privacy-controls",
]) {
  if (!routePaths.has(route)) fail(`missing canonical route ${route}`);
}

if (receipt.deployedSha && receipt.testedSha !== receipt.deployedSha) {
  fail("deployedSha must equal testedSha");
}
if (receipt.deployedSha && receipt.candidateSha !== receipt.deployedSha) {
  fail("deployedSha must equal candidateSha");
}
if (receipt.deployedSha && !receipt.rollbackSha) {
  fail("a deployed release must record rollbackSha");
}
if (receipt.deployedSha && !receipt.manifestSha) {
  fail("a deployed release must record manifestSha");
}

const expectedAssetCounts = { v1: 53, v2: 80, v3: 14, v4: 39, v5: 27 };
for (const [version, expected] of Object.entries(expectedAssetCounts)) {
  if (receipt.assetContract?.[version] !== expected) {
    fail(`asset contract ${version} must equal ${expected}`);
  }
}

const allowedEvidenceStates = new Set([
  "passed",
  "failed",
  "pending",
  "not-applicable-to-web-release",
]);
const requiredNonXrChecks = [
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
];
const requiredCheckNames = [...requiredNonXrChecks, "physicalXr"];

if (!receipt.checks || typeof receipt.checks !== "object") {
  fail("checks must be an object");
}
for (const name of requiredCheckNames) {
  if (!(name in receipt.checks)) fail(`missing required check ${name}`);
}
for (const [name, state] of Object.entries(receipt.checks)) {
  if (!allowedEvidenceStates.has(state)) fail(`invalid evidence state for ${name}`);
}

if (!receipt.evidenceArtifacts || typeof receipt.evidenceArtifacts !== "object") {
  fail("evidenceArtifacts must be an object");
}
for (const [name, artifact] of Object.entries(receipt.evidenceArtifacts)) {
  if (!artifact || typeof artifact !== "object") {
    fail(`evidence artifact ${name} must be an object`);
  }
  if (typeof artifact.path !== "string" || artifact.path.trim() === "") {
    fail(`evidence artifact ${name} must record a path`);
  }
  if (!isSha256(artifact.sha256)) {
    fail(`evidence artifact ${name} must record a SHA-256 digest`);
  }
}

const requiredCoreArtifacts = [
  "canonicalContract",
  "routeContract",
  "runtimeCompile",
  "runtimeSmoke",
  "productTypecheck",
  "productBuild",
];
const requiredCertificationArtifacts = [
  "browserFlow",
  "mobileFlow",
  "accessibility",
  "customDomain",
  "rollback",
];
const hasArtifacts = (names) => names.every((name) => Boolean(receipt.evidenceArtifacts[name]));

const allRoutesVerified = receipt.routes.every(
  (route) => route.productionState === "verified"
);
const requiredChecksPassed = requiredNonXrChecks.every(
  (name) => receipt.checks[name] === "passed"
);
const certificationFieldsComplete = Boolean(
  receipt.candidateSha &&
    receipt.testedSha &&
    receipt.deployedSha &&
    receipt.rollbackSha &&
    receipt.manifestSha &&
    receipt.candidateSha === receipt.testedSha &&
    receipt.testedSha === receipt.deployedSha &&
    requiredChecksPassed &&
    hasArtifacts(requiredCoreArtifacts) &&
    hasArtifacts(requiredCertificationArtifacts)
);

if (allRoutesVerified !== certificationFieldsComplete) {
  fail(
    "verified routes require matching candidate/tested/deployed SHAs, rollback SHA, manifest SHA-256, passed checks, and hashed core/certification evidence artifacts"
  );
}

if (receipt.deployedSha && !hasArtifacts(requiredCoreArtifacts)) {
  fail("a deployed receipt must include hashed canonical, route, runtime, typecheck, and build evidence artifacts");
}

console.log(
  JSON.stringify(
    {
      schemaVersion: receipt.schemaVersion,
      releaseId: receipt.releaseId,
      routes: receipt.routes.length,
      deployed: Boolean(receipt.deployedSha),
      failClosed: !receipt.deployedSha && !allRoutesVerified,
      manifestDigestRecorded: Boolean(receipt.manifestSha),
      evidenceArtifacts: Object.keys(receipt.evidenceArtifacts).length,
      requiredChecks: requiredCheckNames,
      assetContract: expectedAssetCounts,
      status: "pass",
    },
    null,
    2
  )
);
