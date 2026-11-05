import type { SelectedMemoryMediaReceipt } from './selectedMemoryContract'

export const OWNED_MEMORY_PLAYBACK_MAX_BYTES = 4 * 1024 * 1024
export type OwnedMemoryPlaybackDescriptor = {
  schemaVersion: 'urai-owned-memory-media-playback-v1'
  requiresAuthorization: true
  ownerId: string
  memoryId: string
  receiptId: string
  kind: 'image' | 'audio' | 'video'
  contentType: string
  sha256: string
  byteLength: number
  storageGeneration: string
  sourceAuthorityHash: string
  authorityHash: string
  expiresAt: number
}
const MIME: Record<string, string> = { 'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image',
  'audio/mpeg': 'audio', 'audio/wav': 'audio', 'audio/ogg': 'audio', 'video/mp4': 'video', 'video/webm': 'video' }
const KEYS = ['schemaVersion', 'requiresAuthorization', 'ownerId', 'memoryId', 'receiptId', 'kind', 'contentType',
  'sha256', 'byteLength', 'storageGeneration', 'sourceAuthorityHash', 'authorityHash', 'expiresAt']

export function validateOwnedMemoryPlaybackDescriptor(value: unknown,
  expected: { ownerId: string; memoryId: string; receipt: SelectedMemoryMediaReceipt; now?: number }): value is OwnedMemoryPlaybackDescriptor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const d = value as Record<string, unknown>, now = expected.now ?? Date.now()
  return Object.keys(d).length === KEYS.length && Object.keys(d).every(key => KEYS.includes(key))
    && d.schemaVersion === 'urai-owned-memory-media-playback-v1' && d.requiresAuthorization === true
    && d.ownerId === expected.ownerId && d.memoryId === expected.memoryId && d.receiptId === expected.receipt.mediaReceiptId
    && d.kind === expected.receipt.kind && typeof d.contentType === 'string' && MIME[d.contentType] === d.kind
    && typeof d.sha256 === 'string' && /^[a-f0-9]{64}$/.test(d.sha256)
    && typeof d.storageGeneration === 'string' && /^[1-9][0-9]{0,39}$/.test(d.storageGeneration)
    && typeof d.sourceAuthorityHash === 'string' && /^[a-f0-9]{64}$/.test(d.sourceAuthorityHash)
    && typeof d.authorityHash === 'string' && /^[a-f0-9]{64}$/.test(d.authorityHash)
    && Number.isSafeInteger(d.byteLength) && Number(d.byteLength) > 0 && Number(d.byteLength) <= OWNED_MEMORY_PLAYBACK_MAX_BYTES
    && Number.isSafeInteger(d.expiresAt) && Number(d.expiresAt) > now && Number(d.expiresAt) <= now + 300_000
}

export function ownedMemoryPlaybackEndpoint(descriptor: OwnedMemoryPlaybackDescriptor, projectId: string) {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId)) throw new Error('PRIVATE_MEDIA_PROJECT_UNBOUND')
  const endpoint = new URL(`https://us-central1-${projectId}.cloudfunctions.net/streamMemoryMediaPlayback`)
  for (const key of ['memoryId', 'receiptId', 'authorityHash', 'expiresAt', 'storageGeneration'] as const) endpoint.searchParams.set(key, String(descriptor[key]))
  return endpoint.toString()
}

/** No source locator becomes a video URL. A per-mount blob is released only
 * after the current owner's authenticated response passes full fixity checks. */
export async function fetchOwnedMemoryPlayback(descriptor: OwnedMemoryPlaybackDescriptor, projectId: string,
  lifecycle: { signal: AbortSignal; isCurrent: () => boolean; requestHeaders: () => Promise<Record<string, string>> }, fetcher: typeof fetch = fetch): Promise<Blob> {
  const endpoint = ownedMemoryPlaybackEndpoint(descriptor, projectId), controller = new AbortController()
  const deadline = Math.min(descriptor.expiresAt, Date.now() + 50_000)
  const stop = () => controller.abort()
  lifecycle.signal.addEventListener('abort', stop, { once: true })
  const timer = setTimeout(stop, Math.max(0, deadline - Date.now()))
  const check = () => {
    if (lifecycle.signal.aborted || controller.signal.aborted || !lifecycle.isCurrent() || Date.now() >= deadline) throw new Error('PRIVATE_MEDIA_AUTHORITY_CHANGED')
  }
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    check()
    // Token refresh is not abortable by the fetch signal. Bound its wait by
    // the same cancellation/deadline, and observe late SDK settlement safely.
    let removeTokenAbortListener = () => {}
    const tokenAbort = new Promise<never>((_resolve, reject) => {
      const aborted = () => reject(new Error('PRIVATE_MEDIA_AUTHORITY_CHANGED'))
      removeTokenAbortListener = () => controller.signal.removeEventListener('abort', aborted)
      controller.signal.addEventListener('abort', aborted, { once: true })
      if (controller.signal.aborted) aborted()
    })
    const headers = await Promise.race([
      Promise.resolve().then(() => { check(); return lifecycle.requestHeaders() }),
      tokenAbort,
    ]).finally(removeTokenAbortListener)
    check()
    const response = await fetcher(endpoint, { method: 'GET', headers, cache: 'no-store', credentials: 'omit',
      redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal })
    check()
    const encoding = response.headers.get('content-encoding')
    if (!response.ok || response.status !== 200 || !response.body || response.headers.has('content-range')
      || (encoding && encoding.toLowerCase() !== 'identity')
      || response.headers.get('content-type')?.split(';')[0] !== descriptor.contentType
      || response.headers.get('content-length') !== String(descriptor.byteLength)
      || response.headers.get('x-urai-checksum-sha256') !== descriptor.sha256
      || response.headers.get('x-urai-storage-generation') !== descriptor.storageGeneration) {
      await response.body?.cancel(); throw new Error('PRIVATE_MEDIA_BYTES_UNAVAILABLE')
    }
    reader = response.body.getReader()
    const bytes = new Uint8Array(descriptor.byteLength); let offset = 0
    while (true) {
      check(); const next = await reader.read(); check()
      if (next.done) break
      if (offset + next.value.byteLength > bytes.length) throw new Error('PRIVATE_MEDIA_BYTES_CHANGED')
      bytes.set(next.value, offset); offset += next.value.byteLength
    }
    if (offset !== bytes.length) throw new Error('PRIVATE_MEDIA_BYTES_CHANGED')
    const digest = await crypto.subtle.digest('SHA-256', bytes); check()
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    if (hash !== descriptor.sha256) throw new Error('PRIVATE_MEDIA_BYTES_CHANGED')
    return new Blob([bytes], { type: descriptor.contentType })
  } catch (error) {
    await reader?.cancel().catch(() => {})
    throw error
  } finally {
    clearTimeout(timer); lifecycle.signal.removeEventListener('abort', stop); reader?.releaseLock()
  }
}
