import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function file(path) {
  if (!existsSync(join(root, path))) failures.push(`Missing required file: ${path}`);
}

function contains(path, needle, label = needle) {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures.push(`Missing required file: ${path}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (!text.includes(needle)) failures.push(`Missing ${label} in ${path}`);
}

for (const required of [
  "package.json",
  "pnpm-workspace.yaml",
  "firebase.json",
  "firebase/firestore.rules",
  "firebase/firestore.indexes.json",
  "README.md",
  "urai-tier1/package.json",
  "apps/functions/package.json",
  "verification/launch-lock.json",
  "verification/signoffs.md"
]) file(required);

contains("firebase.json", "nodejs20", "Node 20 Functions runtime");
contains("firebase.json", "urai-spatial-functions", "named functions codebase");
contains("firebase.json", "pnpm --filter urai-tier1 typecheck", "typecheck predeploy");
contains("firebase/firestore.rules", "isAdmin", "admin guard");
contains("firebase/firestore.rules", "match /spatial/{doc=**}", "spatial deny/admin collection rule");
contains("package.json", "test:e2e", "spatial lock e2e script");
contains("urai-tier1/package.json", "verify:tier-lock", "tier lock verifier");
contains("verification/launch-lock.json", "locked_until_verified", "launch lock status");
contains("verification/signoffs.md", "Status: PENDING", "pending signoff markers");

for (const envName of [
  "FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL",
  "URAI_SPATIAL_FIREBASE_PROJECT_ID",
  "URAI_SPATIAL_FIREBASE_WEB_CONFIG"
]) {
  if (!process.env[envName]) warnings.push(`Environment secret not present in this runtime: ${envName}`);
}

if (warnings.length) {
  console.warn("URAI Spatial preflight warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error("URAI Spatial preflight failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("URAI Spatial preflight passed.");
