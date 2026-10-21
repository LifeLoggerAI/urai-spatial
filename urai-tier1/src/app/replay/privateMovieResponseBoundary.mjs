/**
 * Client defense-in-depth for private Life Movie media. A Content-Length
 * header is only a claim: never allow fetch().arrayBuffer() to consume an
 * unbounded response before inspecting the actual byte count. The original
 * Studio/Jobs endpoint remains the authority for consent and provenance.
 */
const LIMITS = Object.freeze({ mp4: 64 * 1024 * 1024, srt: 2 * 1024 * 1024 })
const MIME = Object.freeze({ mp4: 'video/mp4', srt: 'application/x-subrip' })

// Private media is never allowed to remain in a silent network read forever.
// The timeout is per chunk, so legitimate slow connections can keep making
// progress. Never unref this timer: an otherwise-idle Node stream must settle.
const PRIVATE_READ_STALL_MS = 30_000
async function readPrivateStreamChunk(reader, stallMs, onTimeout) {
  const delay = Number.isSafeInteger(stallMs) && stallMs >= 10 && stallMs <= PRIVATE_READ_STALL_MS
    ? stallMs : PRIVATE_READ_STALL_MS
  const timer = setTimeout(onTimeout, delay)
  try { return await reader.read() }
  finally { clearTimeout(timer) }
}

export async function readBoundedPrivateMovieBlob(response, { kind, expectedBytes, signal, isCurrent, readStallMs = PRIVATE_READ_STALL_MS }) {
  const unavailable = () => new Error('private_movie_delivery_unavailable')
  const limit = Object.hasOwn(LIMITS, kind) ? LIMITS[kind] : 0
  let reader = null
  let buffer = null
  let complete = false
  let authorityPoll = null
  let authorityLost = false
  const current = () => {
    try { return !authorityLost && !signal.aborted && isCurrent() === true }
    catch { return false }
  }
  // An account switch or revoked request must interrupt an in-flight read(),
  // not merely be observed after a stalled network delivers another chunk.
  const abortPendingRead = () => {
    if (reader) void reader.cancel('private-movie-session-aborted').catch(() => {})
  }
  try {
    if (!response?.body || response.ok !== true || !Number.isSafeInteger(expectedBytes) || expectedBytes < 1 ||
        expectedBytes > limit || !signal || typeof isCurrent !== 'function' ||
        !current()) throw unavailable()
    // The renderer already validates its producer contract. Recheck any
    // advertised MIME here before accepting opaque private bytes as a movie.
    const declaredMime = response.headers.get('content-type')
    if (declaredMime !== null && declaredMime.split(';', 1)[0].trim().toLowerCase() !== MIME[kind])
      throw unavailable()
    reader = response.body.getReader()
    signal.addEventListener('abort', abortPendingRead, { once: true })
    if (!current()) throw unavailable()
    authorityPoll = setInterval(() => {
      if (!current()) {
        authorityLost = true
        abortPendingRead()
      }
    }, 50)
    authorityPoll.unref?.()
    buffer = new Uint8Array(expectedBytes)
    let written = 0
    for (;;) {
      if (!current()) throw unavailable()
      const { done, value } = await readPrivateStreamChunk(reader, readStallMs, () => {
        authorityLost = true
        abortPendingRead()
      })
      if (!current()) throw unavailable()
      if (done) break
      if (!(value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > expectedBytes - written)
        throw unavailable()
      buffer.set(value, written)
      written += value.byteLength
    }
    if (written !== expectedBytes || !current()) throw unavailable()
    // Blob construction snapshots the verified byte span. Scrub the scratch
    // buffer before returning and never retain the original Response body.
    const blob = new Blob([buffer], { type: MIME[kind] })
    complete = true
    return blob
  } finally {
    if (authorityPoll !== null) clearInterval(authorityPoll)
    signal?.removeEventListener('abort', abortPendingRead)
    if (buffer) buffer.fill(0)
    if (reader) {
      if (!complete) void reader.cancel('private-movie-delivery-denied').catch(() => {})
      reader.releaseLock()
    } else if (response?.body && !response.body.locked) {
      // Also close an unread response rejected by its size or stale session.
      void response.body.cancel('private-movie-delivery-denied').catch(() => {})
    }
  }
}

/**
 * Segmented Life Movie timeline JSON carries private owner-bound metadata.
 * Bound the actual decoded network bytes before reading JSON, not the string
 * length after Response.text() has already buffered the entire body.
 */
export async function readBoundedPrivateMovieTimelineText(response, { signal, isCurrent, readStallMs = PRIVATE_READ_STALL_MS }) {
  const unavailable = () => new Error('private_timeline_size_invalid')
  const MAX_TIMELINE_BYTES = 96 * 1024
  let reader = null
  let scratch = null
  let complete = false
  let authorityPoll = null
  let authorityLost = false
  const current = () => {
    try { return !authorityLost && !signal.aborted && isCurrent() === true }
    catch { return false }
  }
  const abortPendingRead = () => {
    if (reader) void reader.cancel('private-timeline-session-aborted').catch(() => {})
  }
  try {
    if (!response?.body || response.ok !== true || !signal || typeof isCurrent !== 'function' ||
        !current()) throw unavailable()
    const declaredMime = response.headers.get('content-type')
    if (declaredMime !== null && declaredMime.split(';', 1)[0].trim().toLowerCase() !== 'application/json')
      throw unavailable()
    const advertised = response.headers.get('content-length')
    if (advertised !== null) {
      if (!/^[0-9]+$/.test(advertised)) throw unavailable()
      const claimedBytes = Number(advertised)
      if (!Number.isSafeInteger(claimedBytes) || claimedBytes < 1 ||
          claimedBytes > MAX_TIMELINE_BYTES) throw unavailable()
    }
    reader = response.body.getReader()
    signal.addEventListener('abort', abortPendingRead, { once: true })
    if (!current()) throw unavailable()
    authorityPoll = setInterval(() => {
      if (!current()) {
        authorityLost = true
        abortPendingRead()
      }
    }, 50)
    authorityPoll.unref?.()
    scratch = new Uint8Array(MAX_TIMELINE_BYTES)
    let written = 0
    for (;;) {
      if (!current()) throw unavailable()
      const { done, value } = await readPrivateStreamChunk(reader, readStallMs, () => {
        authorityLost = true
        abortPendingRead()
      })
      if (!current()) throw unavailable()
      if (done) break
      if (!(value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > MAX_TIMELINE_BYTES - written)
        throw unavailable()
      scratch.set(value, written)
      written += value.byteLength
    }
    if (!written || !current()) throw unavailable()
    const text = new TextDecoder('utf-8', { fatal: true }).decode(scratch.subarray(0, written))
    if (!current()) throw unavailable()
    complete = true
    return text
  } catch {
    throw unavailable()
  } finally {
    if (authorityPoll !== null) clearInterval(authorityPoll)
    signal?.removeEventListener('abort', abortPendingRead)
    scratch?.fill(0)
    if (reader) {
      if (!complete) void reader.cancel('private-timeline-delivery-denied').catch(() => {})
      reader.releaseLock()
    } else if (response?.body && !response.body.locked) {
      void response.body.cancel('private-timeline-delivery-denied').catch(() => {})
    }
  }
}
