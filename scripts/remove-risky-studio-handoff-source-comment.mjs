import fs from "node:fs";

const branch = process.env.BRANCH_NAME || "";
if (!branch.includes("tier4")) {
  console.error(`Refusing outside tier4 branch: ${branch}`);
  process.exit(1);
}

const routeFile = "urai-tier1/src/app/api/system/studio-spatial-handoff/route.ts";
if (!fs.existsSync(routeFile)) {
  console.error(`Missing ${routeFile}`);
  process.exit(1);
}

let text = fs.readFileSync(routeFile, "utf8");

// Remove the injected live-check vocabulary comment from source.
// The docs carry the required release vocabulary; source must stay clean for spatial-copy gates.
text = text.replace(/\/\*\*\s*\n \* StudioSpatialExport live-check vocabulary:[\s\S]*?\*\/\s*\n\n?/, "");

fs.writeFileSync(routeFile, text);

fs.writeFileSync(
  "docs/release-evidence/tier4/TIER4_SPATIAL_COPY_REGRESSION_FIX_EVIDENCE.md",
  `# Tier 4 Spatial Copy Regression Fix Evidence

Generated: ${new Date().toISOString()}

## Fixed blocker

Removed risky provider vocabulary from \`${routeFile}\` after \`check:spatial-copy\` flagged the source comment.

## Boundary

The Studio to Spatial release-validation vocabulary remains in documentation contract surfaces. Runtime source copy avoids unsupported provider wording and does not claim live provider sync, private memory sync, marketplace, B2B, autonomous, analytics, enterprise, or real-time provider capability.
`
);

console.log(`cleaned ${routeFile}`);
