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
  "id-token: write",
  "FIREBASE_PROJECT_ID",
  "GCP_WIF_PROVIDER",
  "GCP_DEPLOY_SERVICE_ACCOUNT",
  "google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093",
  "google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db",
  "create_credentials_file: true",
  "export_environment_variables: true",
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
  "production-wif-auth.json",
]) {
  assert.ok(workflow.includes(required), `Deploy workflow must include ${required}.`);
}

assert.equal(workflow.includes("FIREBASE_TOKEN"), false, "Legacy Firebase CLI tokens must remain retired.");
assert.equal(workflow.includes("FIREBASE_SERVICE_ACCOUNT_JSON"), false, "Long-lived Firebase service-account JSON must not appear in canonical production workflow.");
assert.equal(workflow.includes("credentials_json:"), false, "Canonical production workflow must not use credentials_json fallback.");
assert.ok(
  workflow.includes("github.event_name == 'workflow_dispatch'") && workflow.includes("github.ref == 'refs/heads/main'"),
  "Production mutation must remain limited to a manual dispatch from main.",
);
assert.ok(
  workflow.includes("inputs.confirm == 'DEPLOY_URAI_APP'") && workflow.includes("inputs.confirm == 'ROLLBACK_URAI_APP'"),
  "Deploy and rollback must retain explicit confirmation values.",
);

const verifyBundleIndex = workflow.indexOf("node scripts/live-release.mjs --verify-prebuilt");
const authIndex = workflow.indexOf("Authenticate dedicated production deploy identity through GitHub OIDC/WIF");
const identityProofIndex = workflow.indexOf("Prove federated production identity without exposing credentials");
const deployIndex = workflow.indexOf("node scripts/live-release.mjs --deploy-prebuilt");
const liveSmokeIndex = workflow.indexOf("node scripts/urai-release-control-smoke.mjs");

assert.ok(verifyBundleIndex >= 0, "The downloaded bundle must be verified before production authentication.");
assert.ok(authIndex > verifyBundleIndex, "WIF authentication must not exist before bundle verification.");
assert.ok(identityProofIndex > authIndex, "Federated identity must be verified after authentication.");
assert.ok(deployIndex > identityProofIndex, "Deployment must use only the verified WIF identity.");
assert.ok(liveSmokeIndex > deployIndex, "Canonical live smoke must run after deployment.");

const deployJobStart = workflow.indexOf("\n  deploy:\n");
assert.ok(deployJobStart >= 0, "Protected deploy job must exist.");
const deployJob = workflow.slice(deployJobStart);
const stepsIndex = deployJob.indexOf("\n    steps:");
const deployJobScope = stepsIndex >= 0 ? deployJob.slice(0, stepsIndex) : deployJob;
assert.match(deployJobScope, /permissions:\n\s+contents: read\n\s+id-token: write/);
assert.match(deployJobScope, /environment: production/);
assert.doesNotMatch(workflow.slice(0, deployJobStart), /id-token:\s*write/);

console.log("URAI deploy workflow WIF canon passed.");
