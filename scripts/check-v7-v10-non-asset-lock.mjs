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
    version: "v7",
    label: "Advanced spatial and XR contract lane",
    requiredPaths: [
      "urai-tier1/src/app/spatial/ar-vr/page.tsx",
      "release/tier-xr-release-matrix.json",
      "release/urai-spatial-live-manifest.json",
      "scripts/check-tier-xr-release-matrix.mjs"
    ],
    requiredScripts: ["xr:contract", "xr:verify", "check:tier-xr-release-matrix"]
  },
  {
    version: "v8",
    label: "Tier 3-5 canon and governance lane",
    requiredPaths: [
      "src/canon/tier3.ts",
      "src/canon/tier4.ts",
      "src/canon/tier5.ts",
      "scripts/check-tier3-governance.mjs",
      "scripts/check-tier4-governance.mjs",
      "scripts/check-tier5-governance.mjs"
    ],
    requiredScripts: ["tier3:check", "tier4:check", "tier5:check", "urai:tier3", "urai:tier4", "urai:tier5"]
  },
  {
    version: "v9",
    label: "Live release and resilient verification lane",
    requiredPaths: [
      ".github/workflows/urai-launch.yml",
      ".github/workflows/spatial-live-deploy.yml",
      "scripts/live-release.mjs",
      "scripts/run-e2e-resilient.mjs",
      "release/urai-spatial-live-manifest.json"
    ],
    requiredScripts: ["live:check", "live:deploy", "verify:e2e:resilient", "verify:release:critical"]
  },
  {
    version: "v10",
    label: "Final proof pack and launch boundary lane",
    requiredPaths: [
      "README.md",
      "audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md",
      "scripts/check-v1-v6-non-asset-lock.mjs",
      "package.json"
    ],
    requiredScripts: ["lock:v1-v6:non-assets", "verify:v1-v6:non-assets", "verify:release:critical"]
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
  decision: failures.length === 0 ? "V7_V10_NON_ASSET_LOCK_READY" : "V7_V10_NON_ASSET_LOCK_INCOMPLETE",
  scope: "V7-V10 non-asset closure",
  excludes: [
    "final generated art assets",
    "final cinematic or AAA replacement assets",
    "external XR validation",
    "store or distribution packet completion"
  ],
  lanes: laneReports,
  failures
};

fs.mkdirSync(path.join(root, "audit/v7-v10"), { recursive: true });
fs.writeFileSync(
  path.join(root, "audit/v7-v10/non-asset-lock-report.json"),
  JSON.stringify(report, null, 2) + "\n"
);

if (failures.length) {
  console.error("[v7-v10-non-asset-lock] incomplete");
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log("[v7-v10-non-asset-lock] ready");
console.log(JSON.stringify(report, null, 2));
