#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowsDir = path.join(root, ".github", "workflows");
const canonicalRelative = ".github/workflows/urai-spatial-deploy.yml";
const verificationRelative = ".github/workflows/spatial-live-deploy.yml";

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
    /FirebaseExtended\/action-hosting-deploy@/,
    /firebase-tools\s+deploy\b/,
    /(?:pnpm\s+exec\s+)?firebase\s+deploy\b/,
    /pnpm\s+(?:live:deploy(?::static)?|publish:live(?::static)?)\b/,
    /deploy:xr:firebase(?::static)?\b/,
  ].some((pattern) => pattern.test(source));
}

function requireText(source, value, message) {
  if (!source.includes(value)) fail(message);
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

for (const input of [
  "target_sha:",
  "rollback_sha:",
  "certification_run_id:",
  "expected_firebase_project:",
  "deploy_url:",
  "confirmation:",
]) {
  requireText(canonical, input, `${canonicalRelative} must require ${input.replace(":", "")}.`);
}

requireText(
  canonical,
  "environment: ${{ inputs.environment }}",
  `${canonicalRelative} must use the selected protected environment.`,
);
requireText(
  canonical,
  "ref: ${{ inputs.target_sha }}",
  `${canonicalRelative} must check out inputs.target_sha exactly.`,
);
requireText(
  canonical,
  'test "$(git rev-parse HEAD)" = "$TARGET_SHA"',
  `${canonicalRelative} must verify the checked-out SHA.`,
);
requireText(
  canonical,
  'git merge-base --is-ancestor "$TARGET_SHA" origin/main',
  `${canonicalRelative} must require the target SHA to be merged into main.`,
);
requireText(
  canonical,
  'git merge-base --is-ancestor "$ROLLBACK_SHA" "$TARGET_SHA"',
  `${canonicalRelative} must require the rollback SHA to be an ancestor of the target.`,
);
requireText(
  canonical,
  "actions/download-artifact@v4",
  `${canonicalRelative} must consume an exact certification artifact.`,
);
requireText(
  canonical,
  "v50-canonical-evidence-${{ inputs.target_sha }}",
  `${canonicalRelative} must bind the V50 artifact name to target_sha.`,
);
requireText(
  canonical,
  "tested-commit-sha.txt",
  `${canonicalRelative} must verify the certification artifact SHA.`,
);
requireText(
  canonical,
  "pnpm install --frozen-lockfile",
  `${canonicalRelative} must install from the frozen lockfile.`,
);
requireText(
  canonical,
  "node-version: 22",
  `${canonicalRelative} must use Node 22.`,
);
requireText(
  canonical,
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  `${canonicalRelative} must require a service account from the protected environment.`,
);
requireText(
  canonical,
  "materialize-release-receipt.mjs",
  `${canonicalRelative} must materialize the exact release receipt.`,
);
requireText(
  canonical,
  "smoke-live-route-fingerprints.mjs",
  `${canonicalRelative} must verify deployed route identities.`,
);
requireText(
  canonical,
  "DEPLOY_URAI_PRODUCTION",
  `${canonicalRelative} must require explicit production confirmation.`,
);
requireText(
  canonical,
  "https://urai.app",
  `${canonicalRelative} must lock the production custom domain.`,
);
requireText(
  canonical,
  "rollback_sha must differ from target_sha",
  `${canonicalRelative} must reject identical target and rollback SHAs.`,
);

if (canonical.includes("--no-frozen-lockfile")) {
  fail(`${canonicalRelative} must not use a mutable dependency installation.`);
}
if (canonical.includes("FIREBASE_TOKEN")) {
  fail(`${canonicalRelative} must not use the legacy Firebase token fallback.`);
}
if (canonical.includes("static_export:")) {
  fail(`${canonicalRelative} must not expose competing static/framework deployment modes.`);
}
if (!containsProductionDeploy(canonical)) {
  fail(`${canonicalRelative} does not contain the canonical production deploy command.`);
}

if (containsProductionDeploy(verification)) {
  fail(`${verificationRelative} must remain verification-only.`);
}
requireText(
  verification,
  "This workflow performs verification only.",
  `${verificationRelative} must state that it is verification-only.`,
);
requireText(
  verification,
  canonicalRelative,
  `${verificationRelative} must name the sole deployment authority.`,
);

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

if (process.exitCode) process.exit(process.exitCode);

console.log("Deployment authority check passed.");
console.log(`Sole production authority: ${canonicalRelative}`);
console.log("Trigger: workflow_dispatch only");
console.log("Required: exact main SHA, exact V50 artifact, approved rollback ancestor, protected environment");
