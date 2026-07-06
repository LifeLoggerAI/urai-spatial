#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowsDir = path.join(root, ".github", "workflows");
const authority = ".github/workflows/urai-spatial-deploy.yml";

const fail = (message) => {
  console.error(`[deployment-authority] ${message}`);
  process.exitCode = 1;
};

const hasTrigger = (source, name) => new RegExp(`^  ${name}:`, "m").test(source);
const deployPatterns = [
  /FirebaseExtended\/action-hosting-deploy@/,
  /firebase-tools\s+deploy\b/,
  /(?:pnpm\s+exec\s+)?firebase\s+deploy\b/,
  /pnpm\s+(?:live:deploy(?::static)?|publish:live(?::static)?)\b/,
  /pnpm\s+dlx\s+firebase-tools\s+deploy\b/,
  /deploy:xr:firebase(?::static)?\b/,
];
const containsDeploy = (source) => deployPatterns.some((pattern) => pattern.test(source));

if (!existsSync(workflowsDir)) fail("missing .github/workflows");

const authorities = [];
for (const name of readdirSync(workflowsDir).filter((value) => /\.ya?ml$/.test(value)).sort()) {
  const relative = `.github/workflows/${name}`;
  const source = readFileSync(path.join(workflowsDir, name), "utf8");
  if (!containsDeploy(source)) continue;
  if (/hosting:channel:deploy|firebase hosting:channel:deploy/.test(source)) continue;
  authorities.push(relative);
  if (hasTrigger(source, "push")) fail(`${relative} may deploy from push`);
  if (hasTrigger(source, "pull_request")) fail(`${relative} may deploy from pull_request`);
}

if (authorities.length !== 1 || authorities[0] !== authority) {
  fail(`expected sole authority ${authority}; found ${authorities.join(", ") || "none"}`);
}

const canonical = existsSync(path.join(root, authority))
  ? readFileSync(path.join(root, authority), "utf8")
  : "";
for (const required of [
  "workflow_dispatch:",
  "target_sha:",
  "rollback_sha:",
  "confirmation:",
  "ref: ${{ inputs.target_sha }}",
  "git merge-base --is-ancestor \"$TARGET_SHA\" origin/main",
  "git merge-base --is-ancestor \"$ROLLBACK_SHA\" \"$TARGET_SHA\"",
  "pnpm install --frozen-lockfile",
  "node-version: 22",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "DEPLOY_URAI_PRODUCTION",
  "https://urai.app",
  "pnpm live:deploy",
]) {
  if (!canonical.includes(required)) fail(`${authority} missing required contract: ${required}`);
}

if (hasTrigger(canonical, "push") || hasTrigger(canonical, "pull_request")) {
  fail(`${authority} must be workflow_dispatch only`);
}
if (canonical.includes("--no-frozen-lockfile")) fail(`${authority} uses mutable dependency install`);
if (canonical.includes("FIREBASE_TOKEN")) fail(`${authority} uses legacy token authentication`);
if (canonical.includes("static_export:")) fail(`${authority} exposes competing deployment modes`);

if (process.exitCode) process.exit(process.exitCode);

console.log(JSON.stringify({
  status: "pass",
  authority,
  trigger: "workflow_dispatch",
  exactTarget: true,
  rollbackAncestor: true,
  serviceAccountOnly: true,
  project: "urai-4dc1d",
  domain: "https://urai.app"
}, null, 2));
