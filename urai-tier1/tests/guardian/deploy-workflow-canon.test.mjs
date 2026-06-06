import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflowPath = join(root, ".github/workflows/urai-spatial-deploy.yml");

assert.equal(existsSync(workflowPath), true, "Deploy workflow must exist.");

const workflow = readFileSync(workflowPath, "utf8");

for (const required of [
  "workflow_dispatch",
  "environment:",
  "FIREBASE_TOKEN",
  "FIREBASE_PROJECT_ID",
  "corepack pnpm urai:guardian",
  "corepack pnpm check:types",
  "corepack pnpm build",
  "corepack pnpm build:static",
  "firebase-tools deploy",
  "smoke:deployed",
  "smoke:live",
]) {
  assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Deploy workflow must include ${required}.`);
}

const guardianIndex = workflow.indexOf("corepack pnpm urai:guardian");
const typecheckIndex = workflow.indexOf("corepack pnpm check:types");
const deployIndex = workflow.indexOf("firebase-tools deploy");
const liveSmokeIndex = workflow.indexOf("corepack pnpm smoke:live");

assert.ok(guardianIndex >= 0 && guardianIndex < deployIndex, "Guardian must run before deploy.");
assert.ok(typecheckIndex >= 0 && typecheckIndex < deployIndex, "Typecheck must run before deploy.");
assert.ok(liveSmokeIndex >= 0 && liveSmokeIndex > deployIndex, "Live smoke must run after deploy when deploy_url is provided.");

console.log("URAI deploy workflow canon passed.");
