/** Probe the same GET operation authorized by the private signed URL.
 * Cancel the body after headers so the renderer remains the only consumer.
 */
export async function capturedRealityContentLengthAvailable(
  url: string,
  maxRuntimeBytes: number,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  if (!Number.isSafeInteger(maxRuntimeBytes) || maxRuntimeBytes < 32) return false
  const response = await fetcher(url, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    signal,
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
