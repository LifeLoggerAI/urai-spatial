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
const auditedCurrentSha256 = '688426cc452fc56c03420b3ab209afeeaa65cee5eec617c4a8cda8a9a06803ae'

export async function preserveAuditedLifeMapProof() {
  const source = await readFile(proofPath)
  const actual = createHash('sha256').update(source).digest('hex')
  if (actual !== auditedCurrentSha256) {
    throw new Error(`Life Map current proof source is not the audited form: expected SHA-256 ${auditedCurrentSha256}; found ${actual}. Review the changed proof before updating materialization authority.`)
  }
  console.log(`Preserved audited current Life Map proof unchanged at ${proofPath}`)
}
