import fs from "fs";
import path from "path";

const root = process.cwd();

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts || {};

const lanes = [
  {
    version: "v11",
    label: "System APIs and manifest proof lane",
    requiredPaths: [
      "release/urai-spatial-live-manifest.json",
      "urai-tier1/src/app/api/system/health/route.ts",
      "urai-tier1/src/app/api/system/manifest/route.ts",
      "urai-tier1/src/app/api/system/capabilities/route.ts",
      "urai-tier1/src/app/api/system/integration-contract/route.ts"
    ],
    requiredScripts: ["check:production-routes", "live:check"]
  },
  {
    version: "v12",
    label: "Privacy consent and provider boundary proof lane",
    requiredPaths: [
      "firebase/firestore.rules",
      "firebase/firestore.indexes.json",
      "scripts/check-firestore-tier1-boundaries.mjs",
      "scripts/check-spatial-copy.mjs"
    ],
    requiredScripts: ["firebase:rules:check", "check:spatial-copy"]
  },
  {
    version: "v13",
    label: "World ground place and location route proof lane",
    requiredPaths: [
      "urai-tier1/src/app/world/page.tsx",
      "urai-tier1/src/app/ground/page.tsx",
      "urai-tier1/src/app/place/[placeId]/page.tsx",
      "urai-tier1/src/app/place/[placeId]/replay/page.tsx",
      "urai-tier1/src/app/location-map/page.tsx"
    ],
    requiredScripts: ["urai:guardian", "check:production-routes"]
  },
  {
    version: "v14",
    label: "Replay film and cinematic route proof lane",
    requiredPaths: [
      "urai-tier1/src/app/replay/page.tsx",
      "urai-tier1/src/app/replay/[replayId]/page.tsx",
      "urai-tier1/src/app/demo/replay-film/page.tsx",
      "tests/replay-memory-theater-contract.mjs"
    ],
    requiredScripts: ["test:replay-contract", "verify:release:critical"]
  },
  {
    version: "v15",
    label: "Passport council and identity layer proof lane",
    requiredPaths: [
      "urai-tier1/src/app/passport/page.tsx",
      "urai-tier1/src/app/council/page.tsx",
      "urai-tier1/src/app/u/[handle]/page.tsx",
      "urai-tier1/src/app/u/adamclamp/page.tsx"
    ],
    requiredScripts: ["urai:guardian", "check:production-routes"]
  },
  {
    version: "v16",
    label: "Admin internal locks and governance proof lane",
    requiredPaths: [
      "urai-tier1/src/app/internal/locks/page.tsx",
      "scripts/urai-guardian.mjs",
      "scripts/check-runtime-boundary.mjs",
      "scripts/check-source-integrity.mjs"
    ],
    requiredScripts: ["urai:guardian", "check:runtime-boundary", "check:source-integrity"]
  },
  {
    version: "v17",
    label: "Studio handoff and asset interface proof lane",
    requiredPaths: [
      "docs/contracts/URAI_STUDIO_SPATIAL_HANDOFF.md",
      "urai-tier1/src/lib/studio-spatial-handoff.ts",
      "urai-tier1/tests/studio-spatial-handoff.test.mjs"
    ],
    requiredScripts: ["check:launch-boundary-contract", "verify:release:critical"]
  },
  {
    version: "v18",
    label: "Deployment live release and status proof lane",
    requiredPaths: [
      ".github/workflows/spatial-live-deploy.yml",
      ".github/workflows/urai-launch.yml",
      "LIVE_RELEASE.md",
      "DEPLOYMENT.md",
      "STATUS.md",
      "RUNBOOK.md"
    ],
    requiredScripts: ["live:check", "live:deploy", "verify:e2e:resilient"]
  },
  {
    version: "v19",
    label: "Commercial early access invite and checkout proof lane",
    requiredPaths: [
      "urai-tier1/src/app/early-access/page.tsx",
      "urai-tier1/src/app/invite/[code]/page.tsx",
      "urai-tier1/src/app/api/stripe/create-checkout-session/route.ts",
      "urai-tier1/src/app/api/stripe/webhook/route.ts"
    ],
    requiredScripts: ["check:production-routes", "verify:release:critical"]
  },
  {
    version: "v20",
    label: "Final aggregate non asset launch proof lane",
    requiredPaths: [
      "package.json",
      "scripts/check-v1-v6-non-asset-lock.mjs",
      "scripts/check-v7-v10-non-asset-lock.mjs",
      "audit/v7-v10/non-asset-lock-report.json",
      "audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md"
    ],
    requiredScripts: [
      "verify:v1-v6:non-assets",
      "verify:v7-v10:non-assets",
      "verify:v1-v10:non-assets",
      "verify:release:critical"
    ]
  }
];

const failures = [];
const laneReports = [];

for (const lane of lanes) {
  const missingPaths = lane.requiredPaths.filter((p) => !exists(p));
  const missingScripts = lane.requiredScripts.filter((s) => !scripts[s]);

  if (missingPaths.length) failures.push(`${lane.version} missing paths: ${missingPaths.join(", ")}`);
  if (missingScripts.length) failures.push(`${lane.version} missing scripts: ${missingScripts.join(", ")}`);

  laneReports.push({
    ...lane,
    missingPaths,
    missingScripts,
    decision: missingPaths.length === 0 && missingScripts.length === 0 ? "NON_ASSET_LOCK_READY" : "NON_ASSET_LOCK_INCOMPLETE"
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  decision: failures.length === 0 ? "V11_V20_NON_ASSET_LOCK_READY" : "V11_V20_NON_ASSET_LOCK_INCOMPLETE",
  scope: "V11-V20 non-asset closure",
  excludes: [
    "final generated art assets",
    "final cinematic or AAA replacement assets",
    "external XR provider validation",
    "Quest device-lab validation",
    "visionOS device or simulator validation",
    "handheld AR camera/session privacy validation",
    "store or distribution packet completion",
    "paid production media completion"
  ],
  lanes: laneReports,
  failures
};

fs.mkdirSync(path.join(root, "audit/v11-v20"), { recursive: true });
fs.writeFileSync(
  path.join(root, "audit/v11-v20/non-asset-lock-report.json"),
  JSON.stringify(report, null, 2) + "\n"
);

if (failures.length) {
  console.error("[v11-v20-non-asset-lock] incomplete");
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log("[v11-v20-non-asset-lock] ready");
console.log(JSON.stringify(report, null, 2));
