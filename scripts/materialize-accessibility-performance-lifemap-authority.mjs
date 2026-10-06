import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const proofPath = 'urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts'
// Reviewed canonical semantic navigator proof: keyboard selection, disclosed
// sample privacy, exact manifest identity, title containment, expanded mobile
// navigator bounds, history restoration, reduced-motion parity, 320px/landscape
// reflow, native button/filter semantics, focus return, disclosed RTL/text stress,
// supporting route scroll ownership, and reachable first-run instructions.
// Re-reviewed on the Possible Futures convergence after splitting compact
// portrait and landscape onboarding proof into independent bounded tests;
// all semantic, 48px-target, screenshot, focus, Enter-dismiss, and tamper assertions remain.
// Re-reviewed after collapsing redundant Playwright locator round-trips into one
// atomic DOM proof; this changes no asserted accessibility requirement.
// Re-reviewed after #1629 adds mobile overview helper geometry: 48px targets,
// viewport containment, lower-field placement, 8px title/search clearance and
// pointer reachability. Existing semantic/privacy/return assertions are intact.
const auditedCurrentSha256 = '4b6b40a2e25af4884189b0b43c983fa51fc9d7eb2eb82f386a279bd163b695aa'

export async function preserveAuditedLifeMapProof() {
  const source = await readFile(proofPath)
  const actual = createHash('sha256').update(source).digest('hex')
  if (actual !== auditedCurrentSha256) {
    throw new Error(`Life Map current proof source is not the audited form: expected SHA-256 ${auditedCurrentSha256}; found ${actual}. Review the changed proof before updating materialization authority.`)
  }
  console.log(`Preserved audited current Life Map proof unchanged at ${proofPath}`)
}
