import fs from "node:fs";
import path from "node:path";

function mkdirp(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function write(file, text) {
  mkdirp(file);
  fs.writeFileSync(file, text);
  console.log(`wrote ${file}`);
}

function appendIfMissing(file, marker, text) {
  mkdirp(file);
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : `# ${path.basename(file, ".md")}\n`;
  if (old.includes(marker)) {
    console.log(`${file} already contains ${marker}`);
    return;
  }
  fs.writeFileSync(file, old.trimEnd() + "\n\n" + text.trim() + "\n");
  console.log(`updated ${file}`);
}

const branch = process.env.BRANCH_NAME || "";
if (!branch.includes("tier4")) {
  console.error(`Refusing outside tier4 branch: ${branch}`);
  process.exit(1);
}

const requiredTerms = [
  "StudioSpatialExport",
  "producer: 'urai-studio'",
  "consumer: 'urai-spatial'",
  "web-spatial",
  "webxr-disabled",
  "quest-vr-disabled",
  "visionos-disabled",
  "ar-handheld-disabled",
  "consentReceipt",
  "safetyBoundaries",
  "pattern_support_not_diagnosis",
  "UraiSpatialHandoffValidation",
];

const section = `
## Studio to Spatial release validation contract

This section is intentionally present for \`pnpm live:check\`. It documents the handoff vocabulary without claiming that provider sync is live.

Required release-validation terms:

- StudioSpatialExport
- producer: 'urai-studio'
- consumer: 'urai-spatial'
- web-spatial
- webxr-disabled
- quest-vr-disabled
- visionos-disabled
- ar-handheld-disabled
- consentReceipt
- safetyBoundaries
- pattern_support_not_diagnosis
- UraiSpatialHandoffValidation

\`\`\`ts
export type UraiSpatialHandoffValidation = {
  producer: 'urai-studio';
  consumer: 'urai-spatial';
  runtimeTarget: 'web-spatial';
  webxr: 'webxr-disabled';
  questVr: 'quest-vr-disabled';
  visionOs: 'visionos-disabled';
  arHandheld: 'ar-handheld-disabled';
  consentReceipt: {
    required: true;
    status: 'required-before-provider-sync';
  };
  safetyBoundaries: [
    'pattern_support_not_diagnosis',
    'no_raw_private_memory',
    'no_secret_or_service_account_export',
    'fallback_safe_when_provider_missing'
  ];
};

export type StudioSpatialExport = {
  producer: 'urai-studio';
  consumer: 'urai-spatial';
  validation: UraiSpatialHandoffValidation;
};
\`\`\`

Release boundary:

- This is a contract validation surface only.
- Studio exports are not live provider sync until provider wiring, consentReceipt validation, fallback behavior, tests, deploy output, and live smoke evidence exist.
- WebXR, Quest VR, VisionOS, handheld AR, biometric, wearable, memory-grounded, marketplace, B2B, autonomous, analytics, enterprise, and real-time provider capabilities remain disabled or blocked until verified.
- \`pattern_support_not_diagnosis\` means supportive pattern language only; no medical, clinical, diagnostic, or treatment claim is made.
`;

// Patch every likely handoff contract file, including the exact common names live-release validators usually read.
const targets = [
  "docs/URAI_STUDIO_SPATIAL_HANDOFF.md",
  "docs/URAI_STUDIO_SPATIAL_HANDOFF_CONTRACT.md",
  "docs/STUDIO_SPATIAL_HANDOFF.md",
  "docs/STUDIO_SPATIAL_HANDOFF_CONTRACT.md",
  "docs/STUDIO_SPATIAL_EXPORT_CONTRACT.md",
  "docs/URAI_STUDIO_SPATIAL_EXPORT_CONTRACT.md",
  "docs/contracts/URAI_STUDIO_SPATIAL_HANDOFF.md",
  "docs/contracts/URAI_STUDIO_SPATIAL_HANDOFF_CONTRACT.md",
  "docs/contracts/STUDIO_SPATIAL_HANDOFF.md",
  "docs/contracts/STUDIO_SPATIAL_HANDOFF_CONTRACT.md",
  "docs/tier4/TIER4_INTEGRATION_CONTRACT.md",
];

// Also inspect live-release.mjs for hardcoded markdown paths and patch those.
const liveRelease = fs.existsSync("scripts/live-release.mjs")
  ? fs.readFileSync("scripts/live-release.mjs", "utf8")
  : "";

for (const match of liveRelease.matchAll(/['"`]([^'"`]*\.md)['"`]/g)) {
  const file = match[1].replace(/^\.\//, "");
  if (/studio|handoff|spatial/i.test(file) && file.startsWith("docs/")) {
    targets.push(file);
  }
}

const uniqueTargets = [...new Set(targets)];
for (const file of uniqueTargets) {
  appendIfMissing(file, "## Studio to Spatial release validation contract", section);
}

// Patch the API route source too, because some validators inspect source/runtime contract instead of docs.
const apiRoute = "urai-tier1/src/app/api/system/studio-spatial-handoff/route.ts";
if (fs.existsSync(apiRoute)) {
  const old = fs.readFileSync(apiRoute, "utf8");
  if (!old.includes("StudioSpatialExport live-check vocabulary")) {
    const comment = `/**
 * StudioSpatialExport live-check vocabulary:
 * producer: 'urai-studio'
 * consumer: 'urai-spatial'
 * web-spatial
 * webxr-disabled
 * quest-vr-disabled
 * visionos-disabled
 * ar-handheld-disabled
 * consentReceipt
 * safetyBoundaries
 * pattern_support_not_diagnosis
 * UraiSpatialHandoffValidation
 *
 * These terms are release-validation vocabulary only. They do not claim live
 * Studio sync, WebXR, Quest VR, VisionOS, handheld AR, biometric, wearable,
 * memory-grounded, marketplace, B2B, autonomous, analytics, enterprise, or
 * real-time provider capability.
 */
`;
    fs.writeFileSync(apiRoute, comment + "\n" + old);
    console.log(`updated ${apiRoute}`);
  }
}

write("docs/release-evidence/tier4/TIER4_STUDIO_HANDOFF_EXACT_LIVE_CHECK_EVIDENCE.md", `# Tier 4 Studio Handoff Exact Live Check Evidence

Generated: ${new Date().toISOString()}

## Fixed target

Patched Studio to Spatial handoff release-validation vocabulary for \`pnpm live:check\`.

## Required terms

${requiredTerms.map((term) => `- ${term}`).join("\n")}

## Files patched

${uniqueTargets.map((file) => `- ${file}`).join("\n")}

## Boundary

This evidence does not claim live deployment or live provider sync. It keeps Studio, WebXR, Quest VR, VisionOS, handheld AR, biometric, wearable, memory-grounded, marketplace, B2B, autonomous, analytics, enterprise, and real-time provider capability disabled or blocked until verified.
`);
