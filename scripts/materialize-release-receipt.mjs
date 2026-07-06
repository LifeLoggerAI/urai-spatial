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

const sha256File = (filePath) =>
  crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

const requireEvidenceFile = (checkName, envName) => {
  const supplied = process.env[envName]?.trim();
  if (!supplied) {
    throw new Error(`${envName} must point to the evidence file for ${checkName}.`);
  }
  const absolute = path.resolve(supplied);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error(`${envName} does not reference an existing file: ${absolute}`);
  }
  if (fs.statSync(absolute).size === 0) {
    throw new Error(`${envName} evidence file is empty: ${absolute}`);
  }
  return {
    path: path.relative(process.cwd(), absolute) || path.basename(absolute),
    sha256: sha256File(absolute),
  };
};

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
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Release manifest is missing: ${manifestPath}`);
}

const coreEvidenceRequirements = {
  canonicalContract: "URAI_RELEASE_CANONICAL_EVIDENCE",
  routeContract: "URAI_RELEASE_ROUTE_CONTRACT_EVIDENCE",
  runtimeCompile: "URAI_RELEASE_RUNTIME_COMPILE_EVIDENCE",
  runtimeSmoke: "URAI_RELEASE_RUNTIME_SMOKE_EVIDENCE",
  productTypecheck: "URAI_RELEASE_TYPECHECK_EVIDENCE",
  productBuild: "URAI_RELEASE_BUILD_EVIDENCE",
};
const certificationEvidenceRequirements = {
  browserFlow: "URAI_RELEASE_BROWSER_EVIDENCE",
  mobileFlow: "URAI_RELEASE_MOBILE_EVIDENCE",
  accessibility: "URAI_RELEASE_ACCESSIBILITY_EVIDENCE",
  customDomain: "URAI_RELEASE_CUSTOM_DOMAIN_EVIDENCE",
  rollback: "URAI_RELEASE_ROLLBACK_EVIDENCE",
};

const evidenceArtifacts = {};
for (const [checkName, envName] of Object.entries(coreEvidenceRequirements)) {
  evidenceArtifacts[checkName] = requireEvidenceFile(checkName, envName);
}

const requestedCertification = phase === "certified";
if (requestedCertification) {
  for (const [checkName, envName] of Object.entries(certificationEvidenceRequirements)) {
    evidenceArtifacts[checkName] = requireEvidenceFile(checkName, envName);
  }
}

const manifestSha = sha256File(manifestPath);
const releaseId = process.env.URAI_RELEASE_ID?.trim() || `urai-spatial-${deployedSha.slice(0, 12)}`;
const generatedAt = new Date().toISOString();

receipt.releaseId = releaseId;
receipt.generatedAt = generatedAt;
receipt.environment = "production";
receipt.candidateSha = candidateSha;
receipt.testedSha = testedSha;
receipt.deployedSha = deployedSha;
receipt.rollbackSha = rollbackSha;
receipt.manifestSha = manifestSha;
receipt.evidenceArtifacts = evidenceArtifacts;
receipt.checks = {
  canonicalContract: "passed",
  routeContract: "passed",
  runtimeCompile: "passed",
  runtimeSmoke: "passed",
  productTypecheck: "passed",
  productBuild: "passed",
  browserFlow: requestedCertification ? "passed" : "pending",
  mobileFlow: requestedCertification ? "passed" : "pending",
  accessibility: requestedCertification ? "passed" : "pending",
  customDomain: requestedCertification ? "passed" : "pending",
  rollback: requestedCertification ? "passed" : "pending",
  physicalXr: "not-applicable-to-web-release",
};
receipt.routes = receipt.routes.map((route) => ({
  ...route,
  productionState: requestedCertification ? "verified" : "unverified",
}));
receipt.claimBoundary = requestedCertification
  ? "This receipt certifies the exact web release SHA using hashed canonical, route, runtime, build, browser, mobile, accessibility, custom-domain, and rollback evidence files. Provider-backed asset promotions and physical XR/device certification remain separate receipts."
  : "This receipt records the exact deployment candidate, rollback target, and hashed build/runtime evidence but remains uncertified until browser, mobile, accessibility, custom-domain, and exercised rollback evidence files are attached.";

fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(`RELEASE_RECEIPT=${receiptPath}`);
console.log(`RELEASE_RECEIPT_PHASE=${phase}`);
console.log(`RELEASE_RECEIPT_SHA=${deployedSha}`);
console.log(`RELEASE_MANIFEST_SHA256=${manifestSha}`);
console.log(`RELEASE_EVIDENCE_ARTIFACTS=${Object.keys(evidenceArtifacts).length}`);
console.log(`RELEASE_CERTIFIED=${requestedCertification ? "1" : "0"}`);
