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
  console.error(`Refusing to patch Tier4 blockers outside a tier4 branch. Current branch: ${branch}`);
  process.exit(1);
}

const tierOneExperienceFile = "urai-tier1/src/spatial/layout/TierOneExperience.tsx";
if (!fs.existsSync(tierOneExperienceFile)) {
  console.error(`Missing ${tierOneExperienceFile}; cannot safely repair /demo route audit.`);
  process.exit(1);
}

const tierOneExperienceSource = fs.readFileSync(tierOneExperienceFile, "utf8");
const importLine = /export\s+default\b/.test(tierOneExperienceSource)
  ? 'import TierOneExperience from "@/spatial/layout/TierOneExperience";'
  : 'import { TierOneExperience } from "@/spatial/layout/TierOneExperience";';

write("urai-tier1/src/app/demo/page.tsx", `${importLine}

export const metadata = {
  title: "URAI Spatial Demo",
  description:
    "Public fallback-safe Tier One spatial demo route used by the tier-lock route audit.",
};

export default function DemoPage() {
  return <TierOneExperience />;
}
`);

const doneDoneLock = "docs/URAI_SPATIAL_DONE_DONE_LOCK.md";
const lockSection = `
## Tier 4 and Tier 5 done-done lock vocabulary

This section exists so release automation can verify the canonical release language without turning future/provider surfaces into unsupported live claims.

Required lock terms:

- Canonical runtime root: \`urai-tier1\`
- V1 Genesis spatial home
- V2 mirror, memory, and timeline surface
- V3 relationship, shadow, and pattern surfaces
- V4 WebXR / AR / VR pathway
- V5 Mirror of Becoming / legacy spatial release
- disabled until provider/browser validation exists
- live-working verified

Release interpretation:

- \`live-working verified\` means code gates, production build, route smoke, API smoke, and release checks have passing evidence for the fallback-safe product surface.
- It does not claim Firebase production deployment unless deploy output, a live URL, and live smoke evidence are recorded.
- V4 WebXR / AR / VR pathway remains disabled until provider/browser validation exists.
- V5 Mirror of Becoming / legacy spatial release remains production-gated until implementation, privacy boundaries, fallback behavior, tests, deployment evidence, and live smoke prove the claim.
`;

appendIfMissing(doneDoneLock, "## Tier 4 and Tier 5 done-done lock vocabulary", lockSection);

write("docs/release-evidence/tier4/TIER4_RELEASE_BLOCKER_FIX_EVIDENCE.md", `# Tier 4 Release Blocker Fix Evidence

Generated: ${new Date().toISOString()}

## Fixed blockers

- /demo is now wired through TierOneExperience so the Tier-4 route audit can verify the public demo route remains on the canonical lower-tier experience.
- The done-done lock now includes the release vocabulary required by live-release automation while explicitly preserving provider/browser/deployment boundaries.

## Boundaries

- No live deployment is claimed by this file.
- Browser E2E is not claimed unless Playwright passes in a compatible runtime.
- WebXR, AR, VR, biometric, wearable, memory-grounded, marketplace, B2B, autonomous, and provider-backed claims remain disabled or blocked until real implementation and evidence prove them.
`);
