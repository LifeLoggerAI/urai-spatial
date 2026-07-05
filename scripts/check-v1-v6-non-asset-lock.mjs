import fs from "fs";
import path from "path";

const root = process.cwd();

const requiredPaths = [
  "urai-tier1/src/app/page.tsx",
  "urai-tier1/src/app/home/page.tsx",
  "urai-tier1/src/app/life-map/page.tsx",
  "urai-tier1/src/app/focus/page.tsx",
  "urai-tier1/src/app/replay/page.tsx",
  "urai-tier1/src/app/unwind/page.tsx",
  "urai-tier1/src/app/spatial/ar-vr/page.tsx",
  "urai-tier1/src/app/tier3/page.tsx",
  "urai-tier1/src/app/tier4/page.tsx",
  "urai-tier1/src/app/tier5/page.tsx",
  "firebase/firestore.rules",
  "package.json"
];

const assetPatterns = [
  "asset",
  "texture",
  "model",
  "glb",
  "gltf",
  "hdr",
  "sprite",
  "cinematic",
  "visual",
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  "v6"
];

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

const missing = requiredPaths.filter((p) => !exists(p));

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const scripts = packageJson.scripts || {};

const requiredScripts = [
  "lock:static",
  "lock:build",
  "verify:release:full"
];

const missingScripts = requiredScripts.filter((s) => !scripts[s]);

const report = {
  generatedAt: new Date().toISOString(),
  decision: missing.length === 0 && missingScripts.length === 0 ? "NON_ASSET_LOCK_READY" : "NON_ASSET_LOCK_INCOMPLETE",
  scope: "V1-V6 non-asset closure",
  excludes: [
    "final generated art assets",
    "final cinematic/AAA replacement assets",
    "V1-V6 visual asset inventory completion",
    "V7 feature expansion"
  ],
  requiredPaths,
  missingRequiredPaths: missing,
  requiredScripts,
  missingScripts,
  assetLaneKeywords: assetPatterns,
  nextLane: "Complete V1-V6 assets, then open V7 architecture branch"
};

fs.mkdirSync(path.join(root, "audit/v1-v6"), { recursive: true });
fs.writeFileSync(
  path.join(root, "audit/v1-v6/non-asset-lock-report.json"),
  JSON.stringify(report, null, 2) + "\n"
);

if (missing.length || missingScripts.length) {
  console.error("[v1-v6-non-asset-lock] incomplete");
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log("[v1-v6-non-asset-lock] ready");
console.log(JSON.stringify(report, null, 2));
