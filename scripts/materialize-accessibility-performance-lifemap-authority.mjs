import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const proofPath = 'urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts'
// Reviewed canonical semantic navigator proof: keyboard selection, disclosed
// sample privacy, exact manifest identity, title containment, expanded mobile
// navigator bounds, history restoration, and reduced-motion parity.
const auditedCurrentSha256 = 'fb10759342436c2ea060e04735121d38a9fa353a8901fd2ddfd17261d592a30a'

export async function preserveAuditedLifeMapProof() {
  const source = await readFile(proofPath)
  const actual = createHash('sha256').update(source).digest('hex')
  if (actual !== auditedCurrentSha256) {
    throw new Error(`Life Map current proof source is not the audited form: expected SHA-256 ${auditedCurrentSha256}; found ${actual}. Review the changed proof before updating materialization authority.`)
  }
  console.log(`Preserved audited current Life Map proof unchanged at ${proofPath}`)
}
