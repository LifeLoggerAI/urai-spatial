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
type Selection = {
  verifiedOwnerUid: unknown
  memoryId: unknown
  expectedManifestId: unknown
}
type SafeMemory = {
  id: string; ownerId: string; deleted: false; demo: false
  replayManifest: { id: string }
}
type Denial = { status: 'unavailable'; reason: string }
export type ReadOwnerMemoryEvidence =
  | Denial
  | { status: 'ready'; selectedMemory: SafeMemory }

/** R1715: render provenance MUST use an explicit integer manifest version.
 * Unlike the existing browser Replay parser, this authority boundary does
 * NOT default an absent or invalid version to 1. Such a guess could bind a
 * different immutable render plan to the selected Memory Star.
 * Returns no source media, Jobs ID, storage references or playback capability.
 */
export type ReadOwnerMemoryRenderEvidence =
  | Denial
  | { status: 'ready'; selectedMemory: SafeMemory & {
    replayManifest: { id: string; version: number }
  } }

const deny = (reason: string): Denial => ({ status: 'unavailable', reason })

/** Reuse ONE authoritative Memory+policy snapshot pair for both projections.
 * The legacy HTTP-facing read below stays byte-compatible in its returned
 * shape, while the resolver-facing read includes the independently stored
 * version and fails closed if it is missing. No second Memory read is used to
 * fill a missing version after policy approval (avoids a time-of-check race).
 */
async function readCanonicalMemorySelection(input: Selection, reader: Reader): Promise<
  | Denial
  | { status: 'ready'; selectedMemory: SafeMemory; manifestVersion: unknown; sourceDemo: unknown }
> {
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
    }, manifestVersion: (manifest as Record<string, unknown>).version, sourceDemo: raw.demo }
  } catch { return deny('protected_read_unavailable') }
}

/** Original narrow Memory identity API; its response shape is preserved. */
export async function readOwnerMemoryEvidence(
  input: Selection, reader: Reader,
): Promise<ReadOwnerMemoryEvidence> {
  const result = await readCanonicalMemorySelection(input, reader)
  if (result.status !== 'ready') return result
  return { status: 'ready', selectedMemory: result.selectedMemory }
}

/** Additional server-only projection for the governed render resolver.
 * Original request identity, Studio membership, canonical Privacy render
 * purpose and Jobs provenance are STILL separate mandatory approvals.
 */
export async function readOwnerMemoryRenderEvidence(
  input: Selection, reader: Reader,
): Promise<ReadOwnerMemoryRenderEvidence> {
  const result = await readCanonicalMemorySelection(input, reader)
  if (result.status !== 'ready') return result
  // A missing or malformed demo marker is not affirmative private-memory
  // evidence. Keep the narrow legacy identity read unchanged, but prevent
  // the future private render join from silently treating unknown as false.
  if (result.sourceDemo !== false) return deny('explicit_private_memory_required')
  const version = result.manifestVersion
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    return deny('manifest_version_unavailable')
  }
  return {
    status: 'ready',
    selectedMemory: {
      ...result.selectedMemory,
      replayManifest: { id: result.selectedMemory.replayManifest.id, version },
    },
  }
}
