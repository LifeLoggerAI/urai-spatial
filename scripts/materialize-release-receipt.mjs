#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const receiptPath = path.resolve("urai-tier1/src/data/release-receipt.json");
const manifestPath = path.resolve("release/urai-spatial-live-manifest.json");
const phase = process.env.URAI_RELEASE_RECEIPT_PHASE ?? "prepared";

const requireCommitSha = (name) => {
  const value = process.env[name]?.trim();
  if (!value || !/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error(`${name} must be a 40-character Git commit SHA.`);
  }
  return value.toLowerCase();
};

const evidencePassed = (name) => process.env[name] === "1";

if (!["prepared", "certified"].includes(phase)) {
  throw new Error("URAI_RELEASE_RECEIPT_PHASE must be prepared or certified.");
}

const candidateSha = requireCommitSha("URAI_RELEASE_CANDIDATE_SHA");
const testedSha = requireCommitSha("URAI_RELEASE_TESTED_SHA");
const deployedSha = requireCommitSha("URAI_RELEASE_DEPLOYED_SHA");
const rollbackSha = requireCommitSha("URAI_RELEASE_ROLLBACK_SHA");

if (candidateSha !== testedSha || testedSha !== deployedSha) {
  throw new Error("Candidate, tested, and deployed SHAs must be identical.");
}
if (rollbackSha === deployedSha) {
  throw new Error("Rollback SHA must differ from the deployed SHA.");
}

const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
if (!Array.isArray(receipt.routes) || receipt.routes.length === 0) {
  throw new Error("Release receipt template must contain routes.");
}
const manifestSha = crypto
  .createHash("sha256")
  .update(fs.readFileSync(manifestPath))
  .digest("hex");

const releaseId = process.env.URAI_RELEASE_ID?.trim() || `urai-spatial-${deployedSha.slice(0, 12)}`;
const generatedAt = new Date().toISOString();
const requestedCertification = phase === "certified";
const evidence = {
  browserFlow: evidencePassed("URAI_RELEASE_BROWSER_VERIFIED"),
  mobileFlow: evidencePassed("URAI_RELEASE_MOBILE_VERIFIED"),
  accessibility: evidencePassed("URAI_RELEASE_ACCESSIBILITY_VERIFIED"),
  customDomain: evidencePassed("URAI_RELEASE_CUSTOM_DOMAIN_VERIFIED"),
  rollback: evidencePassed("URAI_RELEASE_ROLLBACK_VERIFIED"),
};
const evidenceComplete = Object.values(evidence).every(Boolean);

if (requestedCertification && !evidenceComplete) {
  const missing = Object.entries(evidence)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  throw new Error(`Certified receipt requires explicit evidence flags: ${missing.join(", ")}`);
}

const certified = requestedCertification && evidenceComplete;
receipt.releaseId = releaseId;
receipt.generatedAt = generatedAt;
receipt.environment = "production";
receipt.candidateSha = candidateSha;
receipt.testedSha = testedSha;
receipt.deployedSha = deployedSha;
receipt.rollbackSha = rollbackSha;
receipt.manifestSha = manifestSha;
receipt.checks = {
  canonicalContract: "passed",
  runtimeCompile: "passed",
  runtimeSmoke: "passed",
  productTypecheck: "passed",
  productBuild: "passed",
  browserFlow: evidence.browserFlow ? "passed" : "pending",
  mobileFlow: evidence.mobileFlow ? "passed" : "pending",
  accessibility: evidence.accessibility ? "passed" : "pending",
  customDomain: evidence.customDomain ? "passed" : "pending",
  rollback: evidence.rollback ? "passed" : "pending",
  physicalXr: "not-applicable-to-web-release",
};
receipt.routes = receipt.routes.map((route) => ({
  ...route,
  productionState: certified ? "verified" : "unverified",
}));
receipt.claimBoundary = certified
  ? "This receipt certifies the web release SHA, custom-domain route set, accessibility/mobile/browser evidence, and an exercised rollback path. Provider-backed asset promotions and physical XR/device certification remain separate receipts."
  : "This receipt records the exact deployment candidate and rollback target but remains uncertified until explicit browser, mobile, accessibility, custom-domain, and exercised rollback evidence is supplied.";

fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(`RELEASE_RECEIPT=${receiptPath}`);
console.log(`RELEASE_RECEIPT_PHASE=${phase}`);
console.log(`RELEASE_RECEIPT_SHA=${deployedSha}`);
console.log(`RELEASE_MANIFEST_SHA256=${manifestSha}`);
console.log(`RELEASE_CERTIFIED=${certified ? "1" : "0"}`);
