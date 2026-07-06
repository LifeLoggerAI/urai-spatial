#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowsDir = path.join(root, ".github", "workflows");
const canonicalRelative = ".github/workflows/urai-spatial-deploy.yml";
const verificationRelative = ".github/workflows/spatial-live-deploy.yml";
const canonicalPath = path.join(root, canonicalRelative);
const verificationPath = path.join(root, verificationRelative);

function fail(message) {
  console.error(`[deployment-authority] ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function hasTopLevelTrigger(source, trigger) {
  return new RegExp(`^  ${trigger}:`, "m").test(source);
}

function containsProductionDeploy(source) {
  return [
    /firebase-tools\s+deploy\b/,
    /firebase\s+deploy\b/,
    /pnpm\s+(?:live:deploy|publish:live)\b/,
    /deploy:xr:firebase\b/,
  ].some((pattern) => pattern.test(source));
}

if (!existsSync(workflowsDir)) {
  fail("Missing .github/workflows directory.");
  process.exit(process.exitCode ?? 1);
}

const canonical = read(canonicalRelative);
const verification = read(verificationRelative);

if (!hasTopLevelTrigger(canonical, "workflow_dispatch")) {
  fail(`${canonicalRelative} must be manually dispatched.`);
}
if (hasTopLevelTrigger(canonical, "push")) {
  fail(`${canonicalRelative} must not have a push trigger.`);
}
if (hasTopLevelTrigger(canonical, "pull_request")) {
  fail(`${canonicalRelative} must not deploy from pull requests.`);
}
if (!canonical.includes("target_sha:")) {
  fail(`${canonicalRelative} must require target_sha.`);
}
if (!canonical.includes("rollback_sha:")) {
  fail(`${canonicalRelative} must require rollback_sha.`);
}
if (!canonical.includes("ref: ${{ inputs.target_sha }}")) {
  fail(`${canonicalRelative} must check out inputs.target_sha exactly.`);
}
if (!canonical.includes("test \"$(git rev-parse HEAD)\" = \"$TARGET_SHA\"")) {
  fail(`${canonicalRelative} must verify the checked-out SHA.`);
}
if (!canonical.includes("rollback_sha must differ from target_sha")) {
  fail(`${canonicalRelative} must reject identical target and rollback SHAs.`);
}
if (!containsProductionDeploy(canonical)) {
  fail(`${canonicalRelative} does not contain the production deploy command.`);
}

if (containsProductionDeploy(verification)) {
  fail(`${verificationRelative} must remain verification-only.`);
}
if (!verification.includes("This workflow performs verification only.")) {
  fail(`${verificationRelative} must state that it is verification-only.`);
}
if (!verification.includes(canonicalRelative)) {
  fail(`${verificationRelative} must name the sole deployment authority.`);
}

const workflowFiles = readdirSync(workflowsDir)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

const productionAuthorities = [];
for (const name of workflowFiles) {
  const relativePath = `.github/workflows/${name}`;
  const source = readFileSync(path.join(workflowsDir, name), "utf8");
  if (!containsProductionDeploy(source)) continue;

  const isPreviewOnly = /hosting:channel:deploy|firebase hosting:channel:deploy/.test(source);
  if (isPreviewOnly) continue;

  productionAuthorities.push(relativePath);
  if (hasTopLevelTrigger(source, "push")) {
    fail(`${relativePath} contains a production deploy command and a push trigger.`);
  }
  if (hasTopLevelTrigger(source, "pull_request")) {
    fail(`${relativePath} contains a production deploy command and a pull_request trigger.`);
  }
}

if (productionAuthorities.length !== 1 || productionAuthorities[0] !== canonicalRelative) {
  fail(
    `Expected exactly one production deployment authority (${canonicalRelative}); found: ${productionAuthorities.join(", ") || "none"}`,
  );
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Deployment authority check passed.");
console.log(`Sole production authority: ${canonicalRelative}`);
console.log("Trigger: workflow_dispatch only");
console.log("Required revisions: target_sha and rollback_sha");
