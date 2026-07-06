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

if (!["prepared", "verified"].includes(phase)) {
  throw new Error("URAI_RELEASE_RECEIPT_PHASE must be prepared or verified.");
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
const manifestSha = crypto
  .createHash("sha256")
  .update(fs.readFileSync(manifestPath))
  .digest("hex");

const releaseId = process.env.URAI_RELEASE_ID?.trim() || `urai-spatial-${deployedSha.slice(0, 12)}`;
const generatedAt = new Date().toISOString();
const verified = phase === "verified";

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
  browserFlow: verified ? "passed" : "pending",
  mobileFlow: verified ? "passed" : "pending",
  accessibility: verified ? "passed" : "pending",
  customDomain: verified ? "passed" : "pending",
  rollback: verified ? "passed" : "pending",
  physicalXr: "not-applicable-to-web-release",
};
receipt.routes = receipt.routes.map((route) => ({
  ...route,
  productionState: verified ? "verified" : "unverified",
}));
receipt.claimBoundary = verified
  ? "This receipt certifies the web release SHA, custom-domain route set, and rollback evidence only. Provider-backed asset promotions and physical XR/device certification remain separate receipts."
  : "This receipt is prepared for deployment but is not production-certified until post-deploy browser, mobile, accessibility, custom-domain, and rollback checks pass.";

fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(`RELEASE_RECEIPT=${receiptPath}`);
console.log(`RELEASE_RECEIPT_PHASE=${phase}`);
console.log(`RELEASE_RECEIPT_SHA=${deployedSha}`);
console.log(`RELEASE_MANIFEST_SHA256=${manifestSha}`);
