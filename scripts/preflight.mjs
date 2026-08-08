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

function containsLower(path, needle, label = needle) {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures.push(`Missing required file: ${path}`);
    return;
  }
  const text = readFileSync(full, "utf8").toLowerCase();
  if (!text.includes(needle.toLowerCase())) failures.push(`Missing ${label} in ${path}`);
}

for (const required of [
  "package.json",
  "pnpm-workspace.yaml",
  "firebase.json",
  "firebase/firestore.rules",
  "firebase/firestore.indexes.json",
  "README.md",
  "RUNBOOK.md",
  "TIER_LOCK_REPORT.md",
  "docs/ARCHITECTURE_LOCK.md",
  "docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md",
  ".github/workflows/spatial-production-lock.yml",
  "scripts/check-runtime-authority.mjs",
  "tests/spatial-lock.mjs",
  "tests/replay-tier5-lock.mjs",
  "urai-tier1/package.json",
  "urai-tier1/src/app/page.tsx",
  "urai-tier1/src/app/home/page.tsx",
  "urai-tier1/src/app/FinalHomeThreshold.tsx",
  "urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx",
  "urai-tier1/src/app/ascent/page.tsx",
  "urai-tier1/src/app/life-map/page.tsx",
  "urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx",
  "urai-tier1/src/app/focus/page.tsx",
  "urai-tier1/src/app/replay/page.tsx",
  "urai-tier1/src/app/loading.tsx",
  "urai-tier1/src/app/error.tsx",
  "urai-tier1/src/app/not-found.tsx",
  "urai-tier1/src/scene/HomeScene.tsx",
  "apps/functions/package.json",
  "verification/launch-lock.json",
  "verification/signoffs.md"
]) file(required);

for (const retired of [
  "urai-tier1/src/spatial/layout/TierOneExperience.tsx",
  "urai-tier1/src/components/urai/UraiV1Experience.tsx",
  "urai-tier1/src/app/RootModeExperience.tsx",
  "urai-tier1/src/spatial/v1/UraiSpatialStage.tsx"
]) {
  if (existsSync(join(root, retired))) failures.push(`Retired parallel runtime still exists: ${retired}`);
}

contains("package.json", "\"packageManager\": \"pnpm@10.0.0\"", "pinned pnpm package manager");
contains("package.json", "runtime:authority", "runtime authority script");
contains("firebase.json", "nodejs22", "Node 22 Functions runtime");
contains("firebase.json", "urai-spatial-functions", "named functions codebase");
contains("firebase.json", "pnpm --filter urai-tier1 typecheck", "typecheck predeploy");
contains("firebase.json", "pnpm --filter urai-functions build", "functions build predeploy");
contains("firebase/firestore.rules", "isAdmin", "admin guard");
contains("firebase/firestore.rules", "match /spatial/{doc=**}", "spatial deny/admin collection rule");
contains("package.json", "test:e2e", "spatial lock e2e script");
contains("tests/spatial-lock.mjs", "const spatialE2ERoutes", "current E2E route lock");
contains("tests/spatial-lock.mjs", "const spatialE2ERecoveryKeys", "current E2E recovery-key lock");
contains("tests/replay-tier5-lock.mjs", "data-scene-mode", "current replay E2E mode attribute");
contains("urai-tier1/package.json", "verify:tier-lock", "tier lock verifier");
contains("verification/launch-lock.json", "locked_until_verified", "launch lock status");
contains("verification/signoffs.md", "Status: PENDING", "pending signoff markers");
contains("docs/ARCHITECTURE_LOCK.md", "FinalHomeThreshold", "canonical Home architecture owner");
contains("docs/ARCHITECTURE_LOCK.md", "SpatialLifeMapCanonical", "canonical Life Map architecture owner");
contains("docs/ARCHITECTURE_LOCK.md", "HomeScene.tsx", "canonical architecture scene");
containsLower("docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md", "legacy / migration-candidate", "legacy path declaration");
contains(".github/workflows/spatial-production-lock.yml", "pnpm/action-setup@v4", "CI pnpm setup");
contains(".github/workflows/spatial-production-lock.yml", "pnpm runtime:authority", "CI runtime authority check");
contains("urai-tier1/scripts/tier-lock/tier-config.mjs", "{ route: '/ascent'", "ascent route tier coverage");

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
