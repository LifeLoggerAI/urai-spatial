import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflowPath = join(root, ".github/workflows/spatial-live-deploy.yml");

assert.equal(existsSync(workflowPath), true, "Canonical spatial release workflow must exist.");

const workflow = readFileSync(workflowPath, "utf8");

for (const required of [
  "workflow_dispatch",
  "release_sha:",
  "rollback_sha:",
  "confirm:",
  "environment: production",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "pnpm install --frozen-lockfile",
  "pnpm --dir urai-tier1 assets:validate",
  "pnpm --dir urai-tier1 typecheck",
  "pnpm --dir urai-tier1 verify:aaa-world",
  "pnpm --dir urai-tier1 xr:verify",
  "pnpm build:static",
  "node scripts/verify-release-credential-boundary.mjs",
  "node scripts/live-release.mjs --verify-prebuilt",
  "node scripts/live-release.mjs --deploy-prebuilt",
  "node scripts/urai-release-control-smoke.mjs",
  "Remove temporary credentials",
]) {
  assert.ok(workflow.includes(required), `Deploy workflow must include ${required}.`);
}

assert.equal(workflow.includes("FIREBASE_TOKEN"), false, "Legacy Firebase CLI tokens must remain retired.");
assert.ok(
  workflow.includes("github.event_name == 'workflow_dispatch'") && workflow.includes("github.ref == 'refs/heads/main'"),
  "Production mutation must remain limited to a manual dispatch from main.",
);
assert.ok(
  workflow.includes("inputs.confirm == 'DEPLOY_URAI_APP'") && workflow.includes("inputs.confirm == 'ROLLBACK_URAI_APP'"),
  "Deploy and rollback must retain explicit confirmation values.",
);

const verifyBundleIndex = workflow.indexOf("node scripts/live-release.mjs --verify-prebuilt");
const credentialIndex = workflow.indexOf("FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}");
const deployIndex = workflow.indexOf("node scripts/live-release.mjs --deploy-prebuilt");
const liveSmokeIndex = workflow.indexOf("node scripts/urai-release-control-smoke.mjs");
const cleanupIndex = workflow.indexOf("Remove temporary credentials");

assert.ok(verifyBundleIndex >= 0, "The downloaded bundle must be verified before deployment.");
assert.ok(credentialIndex > verifyBundleIndex, "Production credentials must not exist before bundle verification.");
assert.ok(deployIndex > credentialIndex, "Deployment must use the short-lived service-account boundary.");
assert.ok(liveSmokeIndex > deployIndex, "Canonical live smoke must run after deployment.");
assert.ok(cleanupIndex > deployIndex, "Temporary credentials must be removed after every deployment attempt.");

console.log("URAI deploy workflow canon passed.");
