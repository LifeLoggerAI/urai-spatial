/** Client-side defense in depth for ADAM's bounded, consent-controlled voice.
 * The server is the sole authority for identity, consent and paid dispatch.
 * This guard rejects stale session deliveries and unbounded or non-audio bodies.
 */
const MAX_VOICE_BYTES = 8 * 1024 * 1024
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'])

export class AdamVoiceResponseError extends Error {
  constructor(code) {
    super('Adam voice output is unavailable.')
    this.name = 'AdamVoiceResponseError'
    this.code = code
  }
}

/** Never hand a stale owner's Blob or an unbounded payload to playback. */
export async function readAuthorizedAdamVoice(response, { signal, isAuthorized }) {
  let reader = null
  let authorityPoll = null
  let authorityLost = false
  const abortPendingRead = () => {
    if (reader) void reader.cancel('adam-voice-session-aborted').catch(() => {})
  }
  const deny = code => {
    // Refuse and dispose even a not-yet-consumed private response.  A failed
    // account/consent/MIME/length check must not leave buffered audio pending.
    if (!reader) {
      try { void response.body?.cancel('adam-voice-denied').catch(() => {}) } catch { /* already locked */ }
    }
    throw new AdamVoiceResponseError(code)
  }
  const current = () => {
    // Authorization is a synchronous boolean contract. A thrown lookup or a
    // truthy non-boolean (including a Promise) cannot authorize private audio.
    try { return !signal.aborted && !authorityLost && isAuthorized() === true }
    catch { return false }
  }
  if (!current()) deny('ADAM_VOICE_SESSION_CHANGED')
  if (!response.ok || !response.body) deny('ADAM_VOICE_RESPONSE_INVALID')
  const contentType = (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase()
  if (!AUDIO_TYPES.has(contentType)) deny('ADAM_VOICE_MIME_INVALID')
  const lengthHeader = response.headers.get('content-length')
  let declaredLength = null
  if (lengthHeader !== null) {
    if (!/^[0-9]+$/.test(lengthHeader)) deny('ADAM_VOICE_LENGTH_INVALID')
    declaredLength = Number(lengthHeader)
    if (!Number.isSafeInteger(declaredLength) || declaredLength <= 0 || declaredLength > MAX_VOICE_BYTES)
      deny('ADAM_VOICE_LENGTH_INVALID')
  }
  reader = response.body.getReader()
  signal.addEventListener('abort', abortPendingRead, { once: true })
  // The input signal normally tracks session changes, but a Firebase owner
  // rotation can occur while a stream is indefinitely stalled in read().
  // Recheck the current actor while the stream is outstanding, canceling the
  // pending read immediately on detection rather than waiting for more bytes.
  authorityPoll = setInterval(() => {
    if (authorityLost) return
    let stillCurrent = false
    try { stillCurrent = current() } catch { /* fail closed */ }
    if (!stillCurrent) {
      authorityLost = true
      abortPendingRead()
    }
  }, 50)
  authorityPoll.unref?.()
  const chunks = []
  let received = 0
  try {
    while (true) {
      if (!current()) deny('ADAM_VOICE_SESSION_CHANGED')
      const { done, value } = await reader.read()
      if (!current()) deny('ADAM_VOICE_SESSION_CHANGED')
      if (done) break
      if (!(value instanceof Uint8Array)) deny('ADAM_VOICE_STREAM_INVALID')
      received += value.byteLength
      if (received > MAX_VOICE_BYTES || (declaredLength !== null && received > declaredLength))
        deny('ADAM_VOICE_LIMIT_EXCEEDED')
      if (value.byteLength) chunks.push(value)
    }
    if (!received || (declaredLength !== null && received !== declaredLength))
      deny('ADAM_VOICE_TRUNCATED')
    if (!current()) deny('ADAM_VOICE_SESSION_CHANGED')
    return new Blob(chunks, { type: contentType })
  } catch (error) {
    // Cancellation also applies when the caller's account or consent changes.
    void reader.cancel('adam-voice-denied').catch(() => {})
    throw error
  } finally {
    if (authorityPoll !== null) clearInterval(authorityPoll)
    signal.removeEventListener('abort', abortPendingRead)
    reader.releaseLock()
  }
}

/**
 * A failed ADAM HTTP request can still contain private content. Only a small,
 * machine-readable server code can escape the client boundary. Never expose
 * the provider's raw body or message to a new owner or unlimited buffer.
 */
const MAX_ERROR_BYTES = 4096
const VALID_CODE = /^[A-Z][A-Z0-9_]{0,119}$/

export async function readBoundedAdamErrorCode(response, { signal, isAuthorized, fallbackCode }) {
  const fallback = VALID_CODE.test(fallbackCode) ? fallbackCode : 'ADAM_PROVIDER_BOUNDARY_FAILURE'
  const owned = () => {
    try { return Boolean(signal) && !signal.aborted && isAuthorized() === true }
    catch { return false }
  }
  if (!response?.body) return owned() ? fallback : 'AUTH_SESSION_CHANGED'
  if (!owned()) {
    try { void response.body.cancel('adam-error-owner-changed').catch(() => {}) } catch {}
    return 'AUTH_SESSION_CHANGED'
  }
  let reader
  try { reader = response.body.getReader() }
  catch { return fallback }
  const cancel = () => { void reader.cancel('adam-error-owner-changed').catch(() => {}) }
  const poll = setInterval(() => { if (!owned()) cancel() }, 50)
  poll.unref?.()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    // Fail closed on a declared error-body size before waiting on a stalled
    // provider. Actual streamed bytes remain independently capped below.
    const advertised = response.headers?.get('content-length')
    if (advertised !== null && advertised !== undefined) {
      if (!/^[0-9]+$/.test(advertised) || !Number.isSafeInteger(Number(advertised))
        || Number(advertised) < 1 || Number(advertised) > MAX_ERROR_BYTES) return fallback
    }
    const chunks = []
    let size = 0
    for (;;) {
      if (!owned()) return 'AUTH_SESSION_CHANGED'
      const { done, value } = await reader.read()
      if (!owned()) return 'AUTH_SESSION_CHANGED'
      if (done) break
      if (!(value instanceof Uint8Array) || value.byteLength > MAX_ERROR_BYTES - size) return fallback
      size += value.byteLength
      chunks.push(value)
    }
    if (!size) return fallback
    const data = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength }
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data))
    const code = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.error : null
    return typeof code === 'string' && VALID_CODE.test(code) ? code : fallback
  } catch { return owned() ? fallback : 'AUTH_SESSION_CHANGED' }
  finally {
    clearInterval(poll)
    signal.removeEventListener('abort', cancel)
    cancel()
    reader.releaseLock()
  }
}
