import fs from "node:fs";

const manifestPath = process.argv[2] ?? "urai-tier1/public/assets/urai/final/manifests/urai-final-assets.json";

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const assets = Array.isArray(manifest.assets) ? manifest.assets : [];

const report = {
  generatedAt: new Date().toISOString(),
  manifest: manifestPath,
  assetCount: assets.length,
  ready: assets.filter((asset) => asset.ready).length,
  missing: assets.filter((asset) => !asset.ready).length,
  names: assets.map((asset) => asset.name),
};

console.log(JSON.stringify(report, null, 2));
