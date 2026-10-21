/** Bound and cancel private ADAM error bodies; server error text is not user-facing authority. */
const MAX_ERROR_BYTES = 4096
const CODE = /^[A-Z][A-Z0-9_]{0,119}$/

export async function readBoundedAdamError(response, { signal, isCurrent, fallbackCode }) {
  const fallback = typeof fallbackCode === 'string' && CODE.test(fallbackCode)
    ? fallbackCode : 'ADAM_PROVIDER_BOUNDARY_FAILURE'
  let lost = false
  const current = () => {
    try { return !lost && !signal?.aborted && isCurrent() === true }
    catch { return false }
  }
  const stale = () => ({ code: 'AUTH_SESSION_CHANGED' })
  const failure = () => ({ code: fallback })
  if (!current()) {
    try { void response?.body?.cancel('adam-error-owner-revoked').catch(() => {}) } catch {}
    return stale()
  }
  if (!response?.body) return failure()
  const reader = response.body.getReader()
  const cancel = () => { void reader.cancel('adam-error-denied').catch(() => {}) }
  const onAbort = () => { lost = true; cancel() }
  const poll = setInterval(() => {
    if (!current()) { lost = true; cancel() }
  }, 50)
  poll.unref?.()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const advertised = response.headers?.get('content-length')
    if (advertised !== null && advertised !== undefined) {
      if (!/^[0-9]+$/.test(advertised) || !Number.isSafeInteger(Number(advertised))
          || Number(advertised) > MAX_ERROR_BYTES) return failure()
    }
    const chunks = []
    let size = 0
    while (true) {
      if (!current()) return stale()
      const { done, value } = await reader.read()
      if (!current()) return stale()
      if (done) break
      if (!(value instanceof Uint8Array) || value.byteLength > MAX_ERROR_BYTES - size) return failure()
      size += value.byteLength
      chunks.push(value)
    }
    if (!size) return failure()
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    bytes.fill(0)
    if (!current()) return stale()
    const code = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload.error : null
    // Do not forward arbitrary response.message; it can include user/private provider text.
    return { code: typeof code === 'string' && CODE.test(code) ? code : fallback }
  } catch {
    return current() ? failure() : stale()
  } finally {
    clearInterval(poll)
    signal?.removeEventListener('abort', onAbort)
    cancel()
    reader.releaseLock()
  }
}
