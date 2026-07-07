import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflowPath = join(root, ".github/workflows/urai-spatial-deploy.yml");

assert.equal(existsSync(workflowPath), true, "Deploy workflow must exist.");

const workflow = readFileSync(workflowPath, "utf8");

for (const required of [
  "workflow_dispatch",
  "environment: production",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_PROJECT_ID",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "ref: ${{ github.sha }}",
  "persist-credentials: false",
  "pnpm live:check",
  "pnpm verify:e2e:resilient",
  "pnpm live:deploy",
  "HOST=\"$LIVE_URL\" pnpm smoke",
  "rm -f \"$GOOGLE_APPLICATION_CREDENTIALS\"",
]) {
  assert.ok(workflow.includes(required), `Deploy workflow must include ${required}.`);
}

assert.equal(
  workflow.includes("FIREBASE_TOKEN"),
  false,
  "Deploy workflow must not fall back to the legacy long-lived FIREBASE_TOKEN path.",
);

const exactCheckoutIndex = workflow.indexOf("ref: ${{ github.sha }}");
const verifyIndex = workflow.indexOf("pnpm live:check");
const deployJobIndex = workflow.indexOf("\n  deploy:");
const environmentIndex = workflow.indexOf("environment: production");
const credentialWriteIndex = workflow.indexOf("Write Firebase service account");
const deployIndex = workflow.indexOf("pnpm live:deploy");
const smokeIndex = workflow.indexOf('HOST="$LIVE_URL" pnpm smoke');
const cleanupIndex = workflow.indexOf('rm -f "$GOOGLE_APPLICATION_CREDENTIALS"');

assert.ok(exactCheckoutIndex >= 0 && exactCheckoutIndex < verifyIndex, "Exact commit checkout must precede verification.");
assert.ok(verifyIndex >= 0 && verifyIndex < deployJobIndex, "Release verification must precede the deploy job.");
assert.ok(deployJobIndex >= 0 && environmentIndex > deployJobIndex, "Deploy job must use the production environment.");
assert.ok(credentialWriteIndex >= 0 && credentialWriteIndex < deployIndex, "Service-account material must be written before deploy.");
assert.ok(deployIndex >= 0 && smokeIndex > deployIndex, "Live smoke must run after deploy when a URL is supplied.");
assert.ok(cleanupIndex > deployIndex, "Credential cleanup must run after deployment.");

console.log("URAI deploy workflow canon passed.");
