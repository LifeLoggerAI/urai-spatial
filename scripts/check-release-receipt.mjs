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

const nullableCommitSha = (value, name) => {
  if (value === null) return;
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/i.test(value)) {
    fail(`${name} must be null or a 40-character Git commit SHA`);
  }
};

const nullableManifestSha = (value) => {
  if (value === null) return;
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/i.test(value)) {
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
]) {
  if (!routePaths.has(route)) fail(`missing canonical route ${route}`);
}

if (receipt.deployedSha && receipt.testedSha !== receipt.deployedSha) {
  fail("deployedSha must equal testedSha");
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
for (const [name, state] of Object.entries(receipt.checks ?? {})) {
  if (!allowedEvidenceStates.has(state)) fail(`invalid evidence state for ${name}`);
}

const allRoutesVerified = receipt.routes.every(
  (route) => route.productionState === "verified"
);
const requiredChecksPassed = Object.entries(receipt.checks ?? {})
  .filter(([name]) => name !== "physicalXr")
  .every(([, state]) => state === "passed");
const certificationFieldsComplete = Boolean(
  receipt.candidateSha &&
    receipt.testedSha &&
    receipt.deployedSha &&
    receipt.rollbackSha &&
    receipt.manifestSha &&
    receipt.candidateSha === receipt.testedSha &&
    receipt.testedSha === receipt.deployedSha &&
    requiredChecksPassed
);

if (allRoutesVerified !== certificationFieldsComplete) {
  fail(
    "verified routes require matching candidate/tested/deployed SHAs, rollback SHA, manifest SHA-256, and passed checks"
  );
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
      assetContract: expectedAssetCounts,
      status: "pass",
    },
    null,
    2
  )
);
