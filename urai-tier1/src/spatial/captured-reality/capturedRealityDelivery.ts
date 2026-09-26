/** Probe the same GET operation authorized by the private signed URL.
 * Cancel the body after headers so the renderer remains the only consumer.
 */
export async function capturedRealityContentLengthAvailable(
  url: string,
  maxRuntimeBytes: number,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(url, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    signal,
  })
  try {
    if (!response.ok || response.status !== 200) return false
    const raw = response.headers.get('content-length')
    const length = raw && /^\d+$/.test(raw) ? Number(raw) : NaN
    return Number.isSafeInteger(length) && length > 0 && length <= maxRuntimeBytes
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
