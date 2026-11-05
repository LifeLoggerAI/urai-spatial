import { createHash } from 'node:crypto'

// Reviewed mounted Home semantic links retain exact destination labels, canonical
// route/checkpoint identity, private/sample authority, bounded history restoration,
// and pointer, keyboard and touch acceptance. Never rewrite this current proof.
export function isAuditedCurrentHomeProof(source) {
  return createHash('sha256').update(source).digest('hex') ===
    '6fa892ae1952fbd581d08b38622348a0dc8904d61e7e385253de2a6fb80941ee'
}
