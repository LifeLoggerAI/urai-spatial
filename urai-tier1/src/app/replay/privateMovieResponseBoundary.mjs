/**
 * Client defense-in-depth for private Life Movie media. A Content-Length
 * header is only a claim: never allow fetch().arrayBuffer() to consume an
 * unbounded response before inspecting the actual byte count. The original
 * Studio/Jobs endpoint remains the authority for consent and provenance.
 */
const LIMITS = Object.freeze({ mp4: 64 * 1024 * 1024, srt: 2 * 1024 * 1024 })
const MIME = Object.freeze({ mp4: 'video/mp4', srt: 'application/x-subrip' })

export async function readBoundedPrivateMovieBlob(response, { kind, expectedBytes, signal, isCurrent }) {
  const unavailable = () => new Error('private_movie_delivery_unavailable')
  const limit = Object.hasOwn(LIMITS, kind) ? LIMITS[kind] : 0
  let reader = null
  let buffer = null
  let complete = false
  // An account switch or revoked request must interrupt an in-flight read(),
  // not merely be observed after a stalled network delivers another chunk.
  const abortPendingRead = () => {
    if (reader) void reader.cancel('private-movie-session-aborted').catch(() => {})
  }
  try {
    if (!response?.body || !Number.isSafeInteger(expectedBytes) || expectedBytes < 1 ||
        expectedBytes > limit || !signal || typeof isCurrent !== 'function' ||
        signal.aborted || !isCurrent()) throw unavailable()
    reader = response.body.getReader()
    signal.addEventListener('abort', abortPendingRead, { once: true })
    if (signal.aborted) throw unavailable()
    buffer = new Uint8Array(expectedBytes)
    let written = 0
    for (;;) {
      if (signal.aborted || !isCurrent()) throw unavailable()
      const { done, value } = await reader.read()
      if (signal.aborted || !isCurrent()) throw unavailable()
      if (done) break
      if (!(value instanceof Uint8Array) || value.byteLength > expectedBytes - written)
        throw unavailable()
      buffer.set(value, written)
      written += value.byteLength
    }
    if (written !== expectedBytes || signal.aborted || !isCurrent()) throw unavailable()
    // Blob construction snapshots the verified byte span. Scrub the scratch
    // buffer before returning and never retain the original Response body.
    const blob = new Blob([buffer], { type: MIME[kind] })
    complete = true
    return blob
  } finally {
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
