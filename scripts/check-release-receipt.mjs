#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

const receipt = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), "urai-tier1/src/data/release-receipt.json"),
    "utf-8",
  ),
);

const fail = (message) => {
  console.error(`Release receipt validation failed: ${message}`);
  process.exit(1);
};
const commitSha = (value) =>
  value === null || (typeof value === "string" && /^[0-9a-f]{40}$/i.test(value));
const sha256 = (value) =>
  typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);

if (receipt.schemaVersion !== "urai-release-receipt-1") fail("unsupported schemaVersion");

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
  if (typeof receipt[field] !== "string" || !receipt[field].trim()) {
    fail(`missing required string field ${field}`);
  }
}

for (const field of ["candidateSha", "testedSha", "deployedSha", "rollbackSha"]) {
  if (!commitSha(receipt[field])) fail(`${field} must be null or a 40-character Git commit SHA`);
}
if (receipt.manifestSha !== null && !sha256(receipt.manifestSha)) {
  fail("manifestSha must be null or a 64-character SHA-256 digest");
}

const requiredRoutes = [
  "/", "/home", "/ground", "/spatial", "/life-map", "/focus", "/replay",
  "/mirror", "/passport", "/status", "/privacy", "/privacy-controls",
  "/location-map", "/ascent", "/unwind", "/demo", "/demo/life-map",
  "/demo/replay-film", "/spatial/life-map", "/spatial/life-map-r3f",
  "/spatial/ar-vr", "/terms",
];
if (!Array.isArray(receipt.routes) || receipt.routes.length === 0) fail("routes must be a non-empty array");
const routePaths = new Set();
for (const route of receipt.routes) {
  if (!route || typeof route !== "object") fail("route entries must be objects");
  if (typeof route.path !== "string" || !route.path.startsWith("/")) fail("each route must have an absolute path");
  if (routePaths.has(route.path)) fail(`duplicate route ${route.path}`);
  routePaths.add(route.path);
  if (!["implemented", "preview"].includes(route.sourceState)) fail(`invalid sourceState for ${route.path}`);
  if (!["verified", "unverified", "failed"].includes(route.productionState)) fail(`invalid productionState for ${route.path}`);
}
for (const route of requiredRoutes) {
  if (!routePaths.has(route)) fail(`missing required public route ${route}`);
}

if (receipt.deployedSha && receipt.testedSha !== receipt.deployedSha) fail("deployedSha must equal testedSha");
if (receipt.deployedSha && receipt.candidateSha !== receipt.deployedSha) fail("deployedSha must equal candidateSha");
if (receipt.deployedSha && !receipt.rollbackSha) fail("a deployed release must record rollbackSha");
if (receipt.deployedSha && !receipt.manifestSha) fail("a deployed release must record manifestSha");

const expectedAssets = { v1: 53, v2: 80, v3: 14, v4: 39, v5: 27 };
for (const [version, count] of Object.entries(expectedAssets)) {
  if (receipt.assetContract?.[version] !== count) fail(`asset contract ${version} must equal ${count}`);
}

const requiredNonXrChecks = [
  "canonicalContract", "routeContract", "runtimeCompile", "runtimeSmoke",
  "productTypecheck", "productBuild", "browserFlow", "mobileFlow",
  "accessibility", "customDomain", "rollback",
];
const requiredChecks = [...requiredNonXrChecks, "physicalXr"];
const allowedStates = new Set(["passed", "failed", "pending", "not-applicable-to-web-release"]);
if (!receipt.checks || typeof receipt.checks !== "object") fail("checks must be an object");
for (const name of requiredChecks) {
  if (!(name in receipt.checks)) fail(`missing required check ${name}`);
}
for (const [name, state] of Object.entries(receipt.checks)) {
  if (!allowedStates.has(state)) fail(`invalid evidence state for ${name}`);
}

if (!receipt.evidenceArtifacts || typeof receipt.evidenceArtifacts !== "object") {
  fail("evidenceArtifacts must be an object");
}
for (const [name, artifact] of Object.entries(receipt.evidenceArtifacts)) {
  if (!artifact || typeof artifact !== "object") fail(`evidence artifact ${name} must be an object`);
  if (typeof artifact.path !== "string" || !artifact.path.trim()) fail(`evidence artifact ${name} must record a path`);
  if (!sha256(artifact.sha256)) fail(`evidence artifact ${name} must record a SHA-256 digest`);
}

const coreArtifacts = [
  "canonicalContract", "routeContract", "runtimeCompile", "runtimeSmoke",
  "productTypecheck", "productBuild",
];
const certificationArtifacts = [
  "browserFlow", "mobileFlow", "accessibility", "customDomain", "rollback",
];
const hasArtifacts = (names) => names.every((name) => Boolean(receipt.evidenceArtifacts[name]));
const allRoutesVerified = receipt.routes.every((route) => route.productionState === "verified");
const allRequiredChecksPassed = requiredNonXrChecks.every((name) => receipt.checks[name] === "passed");
const certificationComplete = Boolean(
  receipt.candidateSha && receipt.testedSha && receipt.deployedSha && receipt.rollbackSha &&
  receipt.manifestSha && receipt.candidateSha === receipt.testedSha &&
  receipt.testedSha === receipt.deployedSha && allRequiredChecksPassed &&
  hasArtifacts(coreArtifacts) && hasArtifacts(certificationArtifacts)
);

if (allRoutesVerified !== certificationComplete) {
  fail("verified routes require matching SHAs, rollback, manifest digest, passed checks, and hashed evidence");
}
if (receipt.deployedSha && !hasArtifacts(coreArtifacts)) {
  fail("a deployed receipt must include hashed canonical, route, runtime, typecheck, and build evidence artifacts");
}

console.log(JSON.stringify({
  schemaVersion: receipt.schemaVersion,
  releaseId: receipt.releaseId,
  routes: receipt.routes.length,
  requiredRoutes: requiredRoutes.length,
  deployed: Boolean(receipt.deployedSha),
  failClosed: !receipt.deployedSha && !allRoutesVerified,
  manifestDigestRecorded: Boolean(receipt.manifestSha),
  evidenceArtifacts: Object.keys(receipt.evidenceArtifacts).length,
  requiredChecks,
  assetContract: expectedAssets,
  status: "pass",
}, null, 2));
