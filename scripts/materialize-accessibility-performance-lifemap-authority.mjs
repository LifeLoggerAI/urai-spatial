import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const proofPath = 'urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts'
// Reviewed canonical semantic navigator proof: keyboard selection, disclosed
// sample privacy, exact manifest identity, title containment, expanded mobile
// navigator bounds, history restoration, reduced-motion parity, 320px/landscape
// reflow, native button/filter semantics, focus return, disclosed RTL/text stress,
// supporting route scroll ownership, and reachable first-run instructions.
const auditedCurrentSha256 = '8b6676e5acd525cfa15499dfa8ff36326d31fb6071e2292d1d8977d8ed474d08'

export async function preserveAuditedLifeMapProof() {
  const source = await readFile(proofPath)
  const actual = createHash('sha256').update(source).digest('hex')
  if (actual !== auditedCurrentSha256) {
    throw new Error(`Life Map current proof source is not the audited form: expected SHA-256 ${auditedCurrentSha256}; found ${actual}. Review the changed proof before updating materialization authority.`)
  }
  console.log(`Preserved audited current Life Map proof unchanged at ${proofPath}`)
}
