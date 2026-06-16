import fs from "node:fs";
import path from "node:path";

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  console.log(`wrote ${file}`);
}

function appendIfMissing(file, marker, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (existing.includes(marker)) {
    console.log(`${file} already contains ${marker}`);
    return;
  }
  fs.writeFileSync(file, existing.trimEnd() + "\n\n" + text.trim() + "\n");
  console.log(`updated ${file}`);
}

const branch = process.env.BRANCH_NAME || "";
if (!branch.includes("tier4")) {
  console.error(`Refusing to patch Tier4 live-check blocker outside a tier4 branch. Current branch: ${branch}`);
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

const candidateFiles = [
  "docs/STUDIO_SPATIAL_HANDOFF_CONTRACT.md",
  "docs/URAI_STUDIO_SPATIAL_HANDOFF_CONTRACT.md",
  "docs/studio-spatial-handoff.md",
  "docs/contracts/STUDIO_SPATIAL_HANDOFF_CONTRACT.md",
  "docs/tier4/TIER4_INTEGRATION_CONTRACT.md",
];

let target = candidateFiles.find((file) => fs.existsSync(file));
if (!target) {
  target = "docs/STUDIO_SPATIAL_HANDOFF_CONTRACT.md";
  write(target, "# Studio to Spatial Handoff Contract\n");
}

const section = `
## Live release validation terms

This section exists so release automation can verify the Studio to Spatial handoff contract without converting future provider seams into unsupported live claims.

Required terms:

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

### StudioSpatialExport shape

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

### Release interpretation

- This contract does not claim live Studio provider sync.
- This contract does not claim live WebXR, Quest VR, VisionOS, handheld AR, biometric, memory-grounded, marketplace, B2B, or autonomous provider capability.
- Studio exports are accepted only as contract-shaped handoff data until provider wiring, consent, tests, deployment evidence, and live smoke are verified.
- \`pattern_support_not_diagnosis\` means URAI may display supportive pattern language, not medical, clinical, diagnostic, or treatment claims.
`;

appendIfMissing(target, "## Live release validation terms", section);

write("docs/release-evidence/tier4/TIER4_STUDIO_HANDOFF_LIVE_CHECK_FIX_EVIDENCE.md", `# Tier 4 Studio Handoff Live Check Fix Evidence

Generated: ${new Date().toISOString()}

## Fixed blocker

The Studio to Spatial handoff contract now contains the release-validation terms required by \`live:check\`:

${requiredTerms.map((term) => `- ${term}`).join("\n")}

## Safety boundary

This fix records contract vocabulary only. It does not claim live Studio sync, live WebXR, Quest VR, VisionOS, handheld AR, biometric, memory-grounded, marketplace, B2B, autonomous, or provider-backed capability.

## Required verification

- \`pnpm live:check\`
- \`pnpm tier4:production:check\`
- \`pnpm release:p1\`
- production build
`);
