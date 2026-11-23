/**
 * Read-only, server-side half of the Spatial Memory -> Studio provenance join.
 * Requires a UID already verified by Firebase Admin. It reads only the owner's
 * canonical memory and memory-domain policy from fixed document paths.
 * This is NOT render consent or a Studio tenant / Jobs job attestation.
 */
import { memoryConsentAdmission } from '../../spatial/memory/memoryConsentAdmission'
import { sanitizeMemoryId } from '../../spatial/memory/selectedMemoryContract'

type Snapshot = { exists: boolean; data(): Record<string, unknown> | undefined }
type Reader = { doc(path: string): { get(): Promise<Snapshot> } }
export type ReadOwnerMemoryEvidence =
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; selectedMemory: {
      id: string; ownerId: string; deleted: false; demo: false
      replayManifest: { id: string }
    } }
const deny = (reason: string): ReadOwnerMemoryEvidence => ({ status: 'unavailable', reason })

export async function readOwnerMemoryEvidence(input: {
  verifiedOwnerUid: unknown
  memoryId: unknown
  expectedManifestId: unknown
}, reader: Reader): Promise<ReadOwnerMemoryEvidence> {
  const owner = input.verifiedOwnerUid
  const memoryId = input.memoryId
  const manifestId = input.expectedManifestId
  if (typeof owner !== 'string' || !sanitizeMemoryId(owner)
    || typeof memoryId !== 'string' || sanitizeMemoryId(memoryId) !== memoryId
    || typeof manifestId !== 'string' || sanitizeMemoryId(manifestId) !== manifestId) {
    return deny('invalid_authoritative_identity')
  }
  try {
    const [memory, policy] = await Promise.all([
      reader.doc(`users/${owner}/memories/${memoryId}`).get(),
      reader.doc(`users/${owner}/privacyPolicy/current`).get(),
    ])
    if (!policy.exists || memoryConsentAdmission(
      policy.exists, policy.data() ?? null, owner
    ) !== 'allowed') return deny('memory_domain_consent_unavailable')
    if (!memory.exists) return deny('selected_memory_missing')
    const raw = memory.data()
    if (!raw || raw.deleted !== false || raw.consentState === 'revoked'
      || raw.consentState === 'pending' || raw.ownerId !== owner
      || raw.demo === true) return deny('selected_memory_not_authorized')
    const manifest = raw.replayManifest
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return deny('manifest_missing')
    const id = (manifest as Record<string, unknown>).id
    if (id !== manifestId) return deny('manifest_mismatch')
    return { status: 'ready', selectedMemory: {
      id: memoryId, ownerId: owner, deleted: false, demo: false,
      replayManifest: { id: manifestId }
    } }
  } catch { return deny('protected_read_unavailable') }
}
