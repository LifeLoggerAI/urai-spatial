/**
 * Draft-only dynamic server boundary. No Next route is exported: static
 * Firebase builds must not acquire an apparently working private API.
 * Callers may provide only IDs, never owner, tenancy, binding or job records.
 */
import { verifyFirebaseUser } from './firebase-user'
import { readOwnerMemoryEvidence } from './owner-memory-evidence'

type MemoryReader = Parameters<typeof readOwnerMemoryEvidence>[1]
type Dependencies = Readonly<{
  verifyOwner: (request: Request) => Promise<string | null>
  readOwnerMemory: typeof readOwnerMemoryEvidence
  reader: () => Promise<MemoryReader>
}>
const noStore = { 'Cache-Control': 'private, no-store, max-age=0', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' }
function reply(status: number, code: string, data?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: status === 200, code, ...data }), { status, headers: noStore })
}
function matchesCurrentMemory(
  evidence: Awaited<ReturnType<typeof readOwnerMemoryEvidence>>,
  ownerUid: string, memoryId: string, manifestId: string,
): boolean {
  return evidence.status === 'ready'
    && evidence.selectedMemory.ownerId === ownerUid
    && evidence.selectedMemory.id === memoryId
    && evidence.selectedMemory.deleted === false
    && evidence.selectedMemory.demo === false
    && evidence.selectedMemory.replayManifest.id === manifestId
}

export async function handleAuthenticatedOwnerMemoryRequest(
  request: Request, dependencies: Dependencies,
): Promise<Response> {
  if (request.method !== 'GET') return reply(405, 'method_not_allowed')
  if (request.headers.get('authorization')?.startsWith('Bearer ') !== true) return reply(401, 'unauthorized')
  let owner: string | null
  try { owner = await dependencies.verifyOwner(request) }
  catch { return reply(503, 'authentication_unavailable') }
  if (!owner) return reply(401, 'unauthorized')
  let url: URL
  try { url = new URL(request.url) } catch { return reply(400, 'invalid_selection') }
  const search = url.searchParams
  if (Array.from(search.keys()).some(k => k !== 'memoryId' && k !== 'manifestId')
    || search.getAll('memoryId').length !== 1 || search.getAll('manifestId').length !== 1) return reply(400, 'invalid_selection')

  const memoryId = search.get('memoryId')
  const manifestId = search.get('manifestId')
  if (memoryId === null || manifestId === null) return reply(400, 'invalid_selection')
  const selection = { verifiedOwnerUid: owner, memoryId, expectedManifestId: manifestId }
  try {
    const initial = await dependencies.readOwnerMemory(selection, await dependencies.reader())
    if (!matchesCurrentMemory(initial, owner, memoryId, manifestId)) return reply(404, 'memory_unavailable')

    // The first read can be stale after awaited Firestore operations. Re-read
    // owner Memory and privacy policy before exposing even minimal identity.
    const current = await dependencies.readOwnerMemory(selection, await dependencies.reader())
    if (!matchesCurrentMemory(current, owner, memoryId, manifestId)) return reply(404, 'memory_unavailable')

    // Firebase ID tokens can be revoked while Firestore reads are in flight.
    // Check the ORIGINAL bearer again, with existing checkRevoked=true auth.
    let lastOwner: string | null
    try { lastOwner = await dependencies.verifyOwner(request) }
    catch { return reply(503, 'authentication_unavailable') }
    if (lastOwner !== owner) return reply(401, 'unauthorized')
    return reply(200, 'memory_identity_verified', { memoryId, manifestId })
  } catch { return reply(503, 'protected_read_unavailable') }
}

/** Server adapter, not a route. Existing WIF-bound Firebase Auth verifies with checkRevoked=true. */
export async function handleOwnerMemoryWithProtectedFirebase(request: Request): Promise<Response> {
  return handleAuthenticatedOwnerMemoryRequest(request, {
    verifyOwner: verifyFirebaseUser,
    readOwnerMemory: readOwnerMemoryEvidence,
    reader: async () => {
      const { getFirestore } = await import('firebase-admin/firestore')
      return getFirestore()
    },
  })
}
