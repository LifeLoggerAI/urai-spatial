/**
 * UrAi digital-human facial-performance bridge.
 *
 * Takes ONLY previously authenticated, private, SHA-256-verified model bytes and
 * an independently authorized per-subject scene instance. This is a rendering
 * adapter, NOT an identity authority, a voice provider, or likeness acceptance.
 * The caller must hide/unload the scene and abort audio/network on revocation.
 */
import { validateHumanAdmission, speechPose, createHumanEncounter, clamp01 } from './humanEncounter.mjs'

const SHA256 = /^[0-9a-f]{64}$/
const SESSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const occupiedRoots = new WeakSet()
const occupiedMorphBuffers = new WeakSet()
const verifiedProofs = new WeakSet()
const MAX_GLB_BYTES = 256 * 1024 * 1024
const neutralResult = (reason) => Object.freeze({ mode: 'neutral', permitted: false, reason })

/**
 * Validates GLB container identity, real bytes and SHA-256 after private fetch.
 * Does not independently certify the consent/rights manifest or the real person.
 */
export async function verifyPrivateGlbBytes(bytes, expectedSha256) {
  if (!SHA256.test(String(expectedSha256 ?? ''))) return { ok: false, reason: 'invalid-expected-sha' }
  const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes)
    : ArrayBuffer.isView(bytes) ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    : null
  if (!data || data.byteLength < 12 || data.byteLength > MAX_GLB_BYTES) return { ok: false, reason: 'invalid-glb-size' }
  const header = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2
    || header.getUint32(8, true) !== data.byteLength) return { ok: false, reason: 'invalid-glb-header' }
  // GLB v2 requires its first chunk to be aligned JSON containing asset.version=2.0.
  if (data.byteLength < 20 || header.getUint32(16, true) !== 0x4e4f534a)
    return { ok: false, reason: 'missing-glb-json-chunk' }
  let cursor = 12
  while (cursor < data.byteLength) {
    if (cursor + 8 > data.byteLength) return { ok: false, reason: 'invalid-glb-chunk' }
    const length = header.getUint32(cursor, true)
    if (length % 4 || cursor + 8 + length > data.byteLength)
      return { ok: false, reason: 'invalid-glb-chunk' }
    cursor += 8 + length
  }
  try {
    const jsonLength = header.getUint32(12, true)
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(data.subarray(20, 20 + jsonLength))
    if (JSON.parse(decoded)?.asset?.version !== '2.0') return { ok: false, reason: 'invalid-glb-asset' }
  } catch { return { ok: false, reason: 'invalid-glb-json' } }
  if (!globalThis.crypto?.subtle) return { ok: false, reason: 'sha256-unavailable' }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
  if (actual !== expectedSha256) return { ok: false, reason: 'glb-sha256-mismatch' }
  const proof = Object.freeze({ ok: true, sha256: actual, byteLength: data.byteLength })
  verifiedProofs.add(proof)
  return proof
}

function liveAuthority(manifest, getAuthority, modelProof) {
  let live
  try { live = getAuthority?.() } catch { return null }
  if (!live || !SESSION.test(String(live.sessionEpoch ?? '')) || live.providerEnabled !== true) return null
  if (!modelProof?.ok || !verifiedProofs.has(modelProof)
    || manifest?.model?.sha256 !== modelProof.sha256) return null
  if (!validateHumanAdmission(manifest, {
    accountId: live.accountId, subjectId: live.subjectId, consentActive: live.consentActive,
  }).ok) return null
  return live
}

/**
 * Bind morph influences belonging to exactly one cloned scene instance.
 * Caller MUST clone the GLTF skeleton correctly (e.g. SkeletonUtils.clone)
 * before passing it. A cached shared useGLTF scene is not safe per character.
 *
 * getAuthority() is refreshed on EVERY rendered frame; it must return a fresh
 * app-auth session epoch, current account/consent/subject and provider state.
 * Client UI checks never replace protected server authorization.
 */
export function createHumanMorphDriver({ root, manifest, modelProof, getAuthority,
  morphNames, encounter = createHumanEncounter() } = {}) {
  if (!root || typeof root.traverse !== 'function') throw new TypeError('scene-root-required')
  if (occupiedRoots.has(root)) throw new Error('scene-instance-already-owned')
  if (!Array.isArray(morphNames) || morphNames.length === 0
    || morphNames.some(name => typeof name !== 'string' || !SESSION.test(name))) {
    throw new TypeError('approved-morph-names-required')
  }
  if (typeof getAuthority !== 'function' || typeof encounter.snapshot !== 'function'
    || typeof encounter.markSpeaking !== 'function') throw new TypeError('authority-and-encounter-required')

  const permittedNames = [...new Set(morphNames)]
  const bindings = []
  root.traverse(node => {
    const dictionary = node?.morphTargetDictionary
    const influences = node?.morphTargetInfluences
    if (!dictionary || !influences || typeof influences.length !== 'number') return
    for (const name of permittedNames) {
      if (!Object.prototype.hasOwnProperty.call(dictionary, name)) continue
      const i = dictionary[name]
      if (Number.isInteger(i) && i >= 0 && i < influences.length) {
        bindings.push({ influences, index: i, name })
      }
    }
  })
  if (!bindings.length) throw new Error('no-approved-facial-targets')
  const buffers = [...new Set(bindings.map(b => b.influences))]
  if (buffers.some(buffer => occupiedMorphBuffers.has(buffer))) throw new Error('shared-character-morph-buffer')
  occupiedRoots.add(root)
  for (const buffer of buffers) occupiedMorphBuffers.add(buffer)
  let disposed = false
  let turn = null
  let sessionEpoch = null
  let audioSha256 = null
  let currentMode = 'neutral'

  function clear() {
    for (const b of bindings) b.influences[b.index] = 0
    turn = null
    sessionEpoch = null
    audioSha256 = null
    currentMode = 'neutral'
  }
  function valid() { return !disposed && liveAuthority(manifest, getAuthority, modelProof) }
  const driver = {
    snapshot() { return Object.freeze({ disposed, activeTurn: turn, mode: currentMode, morphBindings: bindings.length, permitted: Boolean(valid()) }) },
    beginAudio({ turnId, audioSha256: hash } = {}) {
      if (!Number.isSafeInteger(turnId) || turnId < 1 || !SHA256.test(String(hash ?? ''))) return false
      const authority = valid()
      const state = encounter.snapshot()
      if (!authority || state.disposed || !state.near || state.phase !== 'thinking'
        || state.generation !== turnId || !encounter.markSpeaking(turnId)) return false
      clear()
      turn = turnId
      sessionEpoch = authority.sessionEpoch
      audioSha256 = hash
      return true
    },
    frame({ turnId, audioSeconds, audioSha256: hash, timeline,
      rms, playing, muted, interrupted, reducedMotion, deltaSeconds = 1 / 60 } = {}) {
      const authority = valid()
      const state = encounter.snapshot()
      if (authority && authority.sessionEpoch === sessionEpoch && state.near
        && state.phase === 'speaking' && state.generation === turn
        && turn !== null && turnId !== turn) {
        // Ignore an old callback only while this bound turn and actor session remain current.
        // Otherwise clear stale morphs rather than retaining the prior person's expression.
        return Object.freeze({ mode: 'stale-turn-ignored', permitted: true, updatedBindings: 0 })
      }
      if (!authority || !state.near || state.phase !== 'speaking'
        || turn === null || turn !== turnId || state.generation !== turn
        || authority.sessionEpoch !== sessionEpoch || hash !== audioSha256
        || playing !== true || muted === true || interrupted === true
        || !Number.isFinite(audioSeconds) || audioSeconds < 0) {
        clear()
        if (state.phase === 'speaking') encounter.interrupt()
        return neutralResult(!authority ? 'authority-denied' : 'not-currently-speaking')
      }
      const pose = speechPose({ playing: true, audioSeconds, audioSha256: hash, timeline,
        rms, availableMorphs: permittedNames, reducedMotion })
      // Never relabel a malformed, out-of-date lip-sync timeline as phoneme sync.
      // A missing timeline is a disclosed amplitude-only fallback, not a lip-sync claim.
      if (timeline && pose.mode !== 'audio-clock-visemes') {
        for (const b of bindings) b.influences[b.index] = 0
        currentMode = 'neutral'
        return neutralResult('unverified-viseme-timeline')
      }
      if (pose.mode === 'amplitude-only-not-lipsync' && !Number.isFinite(rms)) {
        for (const b of bindings) b.influences[b.index] = 0
        currentMode = 'neutral'
        return neutralResult('no-measured-amplitude')
      }
      const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? Math.min(deltaSeconds, 0.1) : 0
      const alpha = reducedMotion ? 1 : (1 - Math.exp(-25 * dt))
      for (const b of bindings) {
        const target = pose.mode === 'audio-clock-visemes' ? (pose.weights[b.name] ?? 0)
          : (b.name === 'jawOpen' || b.name === 'mouthOpen') ? pose.jawOpen : 0
        const previous = Number.isFinite(b.influences[b.index]) ? b.influences[b.index] : 0
        b.influences[b.index] = clamp01(previous + (target - previous) * alpha)
      }
      currentMode = pose.mode
      return Object.freeze({ mode: currentMode, permitted: true, updatedBindings: bindings.length })
    },
    stop(turnId) {
      if (turn !== turnId || disposed) return false
      clear()
      encounter.finish(turnId)
      return true
    },
    interrupt() { clear(); if (!disposed) encounter.interrupt() },
    dispose() {
      if (disposed) return
      clear()
      disposed = true
      encounter.dispose()
      occupiedRoots.delete(root)
      for (const buffer of buffers) occupiedMorphBuffers.delete(buffer)
    },
  }
  return Object.freeze(driver)
}
