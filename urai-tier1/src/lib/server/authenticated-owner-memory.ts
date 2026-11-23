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
  try {
    const evidence = await dependencies.readOwnerMemory({
      verifiedOwnerUid: owner, memoryId: search.get('memoryId'), expectedManifestId: search.get('manifestId'),
    }, await dependencies.reader())
    if (evidence.status !== 'ready') return reply(404, 'memory_unavailable')
    // Firestore and Auth are independently asynchronous. An owner can be
    // revoked or the selected memory/manifest replaced while the first read
    // is running. Reverify the original bearer and the exact current memory
    // identity before even returning this read-only result.
    const currentOwner = await dependencies.verifyOwner(request)
    if (!currentOwner || currentOwner !== owner) return reply(401, 'unauthorized')
    const currentEvidence = await dependencies.readOwnerMemory({
      verifiedOwnerUid: currentOwner,
      memoryId: evidence.selectedMemory.id,
      expectedManifestId: evidence.selectedMemory.replayManifest.id,
    }, await dependencies.reader())
    if (currentEvidence.status !== 'ready'
      || currentEvidence.selectedMemory.ownerId !== owner
      || currentEvidence.selectedMemory.id !== evidence.selectedMemory.id
      || currentEvidence.selectedMemory.replayManifest.id !== evidence.selectedMemory.replayManifest.id) {
      return reply(404, 'memory_unavailable')
    }
    return reply(200, 'memory_identity_verified', {
      memoryId: currentEvidence.selectedMemory.id,
      manifestId: currentEvidence.selectedMemory.replayManifest.id,
    })
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
