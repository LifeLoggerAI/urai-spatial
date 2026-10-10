export type CapturedRealityStreamAuthority = {
  requestHeaders: () => Promise<Record<string, string>>
  expectedByteLength: number
  expectedSha256: string
}

export type CapturedRealityRuntimeDelivery = {
  assetId: string
  accessMode: 'runtime' | 'proof'
  deviceTier: 'desktop' | 'mobile'
  url: string
  expiresAt: string
  truthLabel: string
  requiresAuthorization: true
  runtimeSha256: string
  runtimeByteLength: number
  storageGeneration: string
}

/** A private token must never be sent to a URL outside the expected project endpoint. */
export function validateCapturedRealityRuntimeDelivery(
  delivery: CapturedRealityRuntimeDelivery,
  expected: { assetId: string; accessMode: 'runtime' | 'proof'; deviceTier: 'desktop' | 'mobile'; projectId: string; maxRuntimeBytes: number; now?: number },
) {
  if (!delivery || delivery.assetId !== expected.assetId || delivery.accessMode !== expected.accessMode
    || delivery.deviceTier !== expected.deviceTier
    || delivery.requiresAuthorization !== true || !/^[a-f0-9]{64}$/i.test(delivery.runtimeSha256)
    || !Number.isSafeInteger(delivery.runtimeByteLength) || delivery.runtimeByteLength < 32
    || delivery.runtimeByteLength % 32 !== 0 || delivery.runtimeByteLength > expected.maxRuntimeBytes
    || typeof delivery.storageGeneration !== 'string' || !/^\d{1,32}$/.test(delivery.storageGeneration)
    || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(expected.projectId)) return false
  const expires = Date.parse(delivery.expiresAt)
  const now = expected.now ?? Date.now()
  if (!Number.isFinite(expires) || expires <= now || expires - now > 11 * 60_000) return false
  try {
    const url = new URL(delivery.url)
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.port
      && url.hostname === `us-central1-${expected.projectId}.cloudfunctions.net`
      && url.pathname === '/streamCapturedRealityRuntime'
      && url.searchParams.get('assetId') === expected.assetId
      && url.searchParams.get('accessMode') === expected.accessMode
      && url.searchParams.get('deviceTier') === expected.deviceTier
      && /^[a-f0-9]{64}$/.test(url.searchParams.get('deliveryId') ?? '')
      && [...url.searchParams.keys()].length === 4
      && [...url.searchParams.keys()].every(key => ['assetId', 'deviceTier', 'accessMode', 'deliveryId'].includes(key))
  } catch { return false }
}

/** Probe the same current-token GET operation used by the private renderer.
 * Cancel the body after headers so the renderer remains the only consumer.
 */
export async function capturedRealityContentLengthAvailable(
  url: string,
  maxRuntimeBytes: number,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  authority?: CapturedRealityStreamAuthority,
) {
  if (!Number.isSafeInteger(maxRuntimeBytes) || maxRuntimeBytes < 32) return false
  signal?.throwIfAborted()
  const headers = authority ? await authority.requestHeaders() : undefined
  signal?.throwIfAborted()
  const response = await fetcher(url, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    signal,
    headers,
  })
  try {
    if (!response.ok || response.status !== 200 || !response.body) return false
    // Drei sizes GPU buffers from Content-Length, then reads decoded bytes.
    // Encoded or partial payloads break that relationship and cannot be mounted.
    const encoding = response.headers.get('content-encoding')
    if (encoding && encoding.toLowerCase() !== 'identity') return false
    if (response.headers.has('content-range')) return false
    const raw = response.headers.get('content-length')
    const length = raw && /^\d+$/.test(raw) ? Number(raw) : NaN
    return Number.isSafeInteger(length) && length > 0 && length % 32 === 0 && length <= maxRuntimeBytes
      && (!authority || length === authority.expectedByteLength)
  } finally {
    await response.body?.cancel()
  }
}

/** Invalidate in-flight private responses at identity and lifecycle boundaries. */
export function createCapturedRealityRequestAuthority() {
  let generation = 0
  return {
    begin() {
      const current = ++generation
      return () => current === generation
    },
    invalidate() {
      generation += 1
    },
  }
}

/** Release the temporary capability context; it is never the scene renderer. */
export function capturedRealityWebGL2Available(
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
) {
  let context: WebGL2RenderingContext | null = null
  try {
    context = createCanvas().getContext('webgl2')
    return Boolean(context)
  } catch {
    return false
  } finally {
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
