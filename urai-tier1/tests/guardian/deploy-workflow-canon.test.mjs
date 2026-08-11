import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflowPath = join(root, ".github/workflows/spatial-live-deploy.yml");

assert.equal(existsSync(workflowPath), true, "Canonical spatial release workflow must exist.");

const workflow = readFileSync(workflowPath, "utf8").replace(/\r\n?/g, "\n");

for (const required of [
  "name: URAI Canonical Production Release Verification",
  "workflow_dispatch:",
  "permissions:\n  contents: read",
  "Verify canonical source with production release quarantined",
  "persist-credentials: false",
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
]) {
  assert.ok(workflow.includes(required), `Quarantine workflow must include ${required}.`);
}

for (const forbidden of [
  "release_sha:",
  "rollback_sha:",
  "environment: production",
  "id-token: write",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_TOKEN",
  "credentials_json:",
  "firebase-service-account.json",
  "node scripts/live-release.mjs --deploy",
  "node scripts/live-release.mjs --deploy-prebuilt",
  "node scripts/firebase-hosting-recovery.mjs",
  "node scripts/urai-release-control-smoke.mjs",
]) {
  assert.equal(workflow.includes(forbidden), false, `Quarantine workflow must not include ${forbidden}.`);
}

assert.match(workflow, /EXACT_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
assert.match(workflow, /ref: \$\{\{ env\.EXACT_HEAD_SHA \}\}/);
assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$EXACT_HEAD_SHA"/);
assert.match(workflow, /echo "Commit: \$EXACT_HEAD_SHA"/);
assert.match(workflow, /name: urai-spatial-production-quarantine-\$\{\{ env\.EXACT_HEAD_SHA \}\}/);
assert.match(workflow, /test -z "\$\(git status --porcelain --untracked-files=all\)"/);

console.log("URAI deploy workflow quarantine canon passed.");
