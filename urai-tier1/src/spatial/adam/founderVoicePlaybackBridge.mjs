import { createFounderCharacterPlaybackGate } from '../digital-human/founderCharacterPlaybackGate.mjs'

/**
 * Adapter for the ORIGINAL Founder playback gate, not another authorization
 * system. Untrusted audio blobs and HTTP success are never authorization.
 * The current Adam endpoint provides neither a verifiable per-turn grant nor
 * a trusted verifier: the production runtime must construct this unconfigured
 * and remain text-only until those independently governed facilities exist.
 */
export function createAdamFounderVoicePlaybackBridge(options = {}) {
  const { ownerAccountId, getAuthority, verifyAuthorizedVoice, createAudio,
    createObjectURL, revokeObjectURL, requestFrame, cancelFrame,
    onFaceFrame = () => {}, onNeutral = () => {}, abortConversation = () => {},
    digestSha256 = async (blob) => {
      const bytes = await blob.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
    },
  } = options
  const configured = typeof ownerAccountId === 'string'
    && typeof getAuthority === 'function' && typeof verifyAuthorizedVoice === 'function'
    && typeof createAudio === 'function' && typeof createObjectURL === 'function'
    && typeof revokeObjectURL === 'function' && typeof requestFrame === 'function'
    && typeof cancelFrame === 'function' && typeof digestSha256 === 'function'
  const gate = configured ? createFounderCharacterPlaybackGate({ownerAccountId,
    getAuthority, verifyAuthorizedVoice, onFaceFrame, onNeutral, abortConversation}) : null
  let flight = 0, pending = false, active = null, disposed = false
  function release() {
    const item = active
    active = null
    if (!item) return
    item.signal?.removeEventListener('abort', item.abort)
    if (item.frame !== null) cancelFrame(item.frame)
    if (item.audio) {
      item.audio.onended = null
      item.audio.onerror = null
      try { item.audio.pause() } catch { /* already denied */ }
      // Only release our own source URL, never a different turn's media.
      try { item.audio.src = '' } catch { /* source already cleared */ }
    }
    try { revokeObjectURL(item.url) } catch { /* cleanup must not unlock playback */ }
  }
  function interrupt(reason = 'interrupted') {
    flight++
    pending = false
    gate?.interrupt()
    release()
  }
  const validEvidence = evidence => evidence && typeof evidence === 'object'
    && /^[a-f0-9]{64}$/.test(String(evidence.audioSha256 ?? ''))
    && /^[a-f0-9]{64}$/.test(String(evidence.voiceApprovalSha256 ?? ''))
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(String(evidence.voiceId ?? ''))
    && evidence.providerReceipt != null
  const frame = (ticket, turnId) => {
    if (!active || active.ticket !== ticket || ticket !== flight || !gate?.frame(turnId)) {
      if (active?.ticket === ticket) interrupt('playback-authority-lost')
      return
    }
    try { active.frame = requestFrame(() => frame(ticket, turnId)) }
    catch { interrupt('playback-monitor-unavailable') }
  }
  return Object.freeze({
    ready: () => Boolean(gate && !disposed),
    isPlaying: () => Boolean(active?.playing && !disposed),
    interrupt,
    dispose: () => { if (!disposed) { interrupt('disposed'); gate?.dispose(); disposed = true } },
    async start({ blob, evidence, signal, locale } = {}) {
      // No trusted account-authority AND verifier = no audio, no URL, no provider.
      if (!gate || disposed || pending || active || signal?.aborted
        || !blob || typeof blob.arrayBuffer !== 'function' || !validEvidence(evidence)) return false
      const id = gate.beginTurn()
      if (id === null) return false
      const ticket = ++flight
      pending = true
      try {
        const actualSha256 = await digestSha256(blob)
        if (actualSha256 !== evidence.audioSha256 || signal?.aborted || ticket !== flight) return false
        const url = createObjectURL(blob)
        let audio
        try { audio = createAudio(url, locale) } catch (error) {
          try { revokeObjectURL(url) } catch { /* safe cleanup */ }
          throw error
        }
        active = { ticket, url, audio, signal, frame: null, playing: false, abort: () => interrupt('cancelled') }
        signal?.addEventListener('abort', active.abort, { once: true })
        audio.onended = () => { if (active?.ticket === ticket) interrupt('ended') }
        audio.onerror = () => { if (active?.ticket === ticket) interrupt('audio-error') }
        if (signal?.aborted || ticket !== flight) return false
        const permitted = await gate.startAuthorizedAudio({ id, media: audio,
          audioSha256:actualSha256, voiceId:evidence.voiceId,
          voiceApprovalSha256:evidence.voiceApprovalSha256,
          providerReceipt:evidence.providerReceipt })
        if (!permitted || signal?.aborted || ticket !== flight || active?.ticket !== ticket) return false
        // Install ongoing authority monitoring BEFORE acknowledging playback.
        active.frame = requestFrame(() => frame(ticket, id))
        active.playing = true
        return true
      } catch { return false }
      finally {
        if (ticket === flight) {
          pending = false
          if (!active?.playing) { gate.interrupt(); release() }
        }
      }
    },
  })
}
