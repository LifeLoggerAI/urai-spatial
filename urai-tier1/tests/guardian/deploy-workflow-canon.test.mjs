import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflowPath = join(root, ".github/workflows/spatial-live-deploy.yml");

assert.equal(existsSync(workflowPath), true, "Canonical spatial production verification workflow must exist.");

const workflow = readFileSync(workflowPath, "utf8");

for (const required of [
  "name: URAI Canonical Production Release Verification",
  "workflow_dispatch:",
  "permissions:",
  "contents: read",
  "EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}",
  "Verify canonical source with production release quarantined",
  "persist-credentials: false",
  "test \"$(git rev-parse HEAD)\" = \"$EXACT_HEAD_SHA\"",
  "pnpm install --frozen-lockfile",
  "node scripts/audit-production-workflow-authority.mjs",
  "node scripts/verify-release-credential-boundary.mjs",
  "node scripts/verify-release-credential-boundary-static.mjs",
  "pnpm --dir urai-tier1 assets:validate",
  "pnpm --dir urai-tier1 typecheck",
  "pnpm --dir urai-tier1 verify:aaa-world",
  "pnpm --dir urai-tier1 xr:verify",
  "Classification: NO-GO",
  "Production release and Hosting recovery are intentionally quarantined.",
  "Re-enable only after short-lived provider identity, WIF/IAM trust, least privilege, runtime read-back, rollback evidence, and historical credential revocation are independently verified.",
  "Upload verification evidence",
]) {
  assert.ok(workflow.includes(required), `Production verification workflow must include ${required}.`);
}

for (const forbidden of [
  "FIREBASE_TOKEN",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "environment: production",
  "release_sha:",
  "rollback_sha:",
  "confirm:",
  "node scripts/live-release.mjs --deploy-prebuilt",
  "node scripts/urai-release-control-smoke.mjs",
  "firebase deploy",
  "firebase hosting:clone",
  "BOOTSTRAP_LEGACY_URAI_APP",
]) {
  assert.equal(workflow.includes(forbidden), false, `Quarantined production workflow must not include ${forbidden}.`);
}

assert.ok(
  workflow.includes("# Failure contract: Long-lived Google/Firebase credential material remains in the canonical production release boundary."),
  "Verification workflow must retain the long-lived credential failure contract.",
);
assert.ok(
  workflow.includes("# Failure contract: Production mutation is forbidden while provider WIF/IAM and runtime identity remain unproven."),
  "Verification workflow must fail closed while provider identity proof is incomplete.",
);

console.log("URAI production verification workflow canon passed.");
