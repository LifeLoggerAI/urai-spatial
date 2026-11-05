// Server-side adapter for independent speech purpose leases and source ports.
// The callers of this factory MUST be trusted server code: never pass request JSON
// as a policy/source reader, and never expose these ports as a client callable.
// No microphone capture, transport, model calls or persistence occur here.
const ID = /^[A-Za-z0-9_-]{1,128}$/
const MAX_LEASE_MS = 30 * 60 * 1000

const validId = (value) => typeof value === 'string' && ID.test(value)
const finite = (value) => typeof value === 'number' && Number.isFinite(value)
const denied = (ownerId, revision = 0) => ({
  owner_id: ownerId, revision, active: false, transcription: false,
  inference: false, session_baseline: false,
})

export function createTrustedSpeechSourcePorts(config) {
  const { ownerId, sessionId, sourceId, providerId, readPrivacyPolicy,
    readSpeechLease, readSourceFeatures, readSessionBaseline, purgeEphemeral,
    now = Date.now } = config ?? {}
  if (![ownerId, sessionId, sourceId, providerId].every(validId)
      || typeof readPrivacyPolicy !== 'function'
      || typeof readSpeechLease !== 'function'
      || typeof readSourceFeatures !== 'function'
      || typeof purgeEphemeral !== 'function'
      || typeof now !== 'function') {
    throw new Error('SPEECH_TRUSTED_SOURCE_PORTS_REQUIRED')
  }

  // A broad models permission never grants transcription, inference, or
  // speaker baselines. All three are independent fields of a separate,
  // server-owned, short-lived, exact-session lease.
  async function readAuthority() {
    const [policy, lease] = await Promise.all([
      readPrivacyPolicy(ownerId), readSpeechLease(ownerId, sessionId),
    ])
    const revision = Number.isSafeInteger(lease?.revision) && lease.revision > 0
      ? lease.revision : 0
    const time = now()
    const validPolicy = policy?.version === 2 && policy.ownerId === ownerId
      && Number.isSafeInteger(policy.revision) && policy.revision >= 0
      && policy.enforcement?.state === 'fully-enforced'
      && ['granted', 'limited'].includes(policy.domains?.models?.mode)
      && policy.domains.models.modelContext === true
    const validLease = lease?.schemaVersion === 'urai-speech-lease-v1'
      && lease.ownerId === ownerId && lease.sessionId === sessionId
      && lease.sourceId === sourceId && lease.providerId === providerId
      && lease.policyRevision === policy?.revision
      && revision > 0 && lease.active === true
      && finite(time) && finite(lease.issuedAtMs) && finite(lease.expiresAtMs)
      && lease.issuedAtMs <= time && time < lease.expiresAtMs
      && lease.expiresAtMs - lease.issuedAtMs <= MAX_LEASE_MS
      && lease.transcription === true && lease.inference === true
    if (!validPolicy || !validLease) return denied(ownerId, revision)
    return {
      owner_id: ownerId, revision, active: true,
      transcription: true, inference: true,
      session_baseline: lease.sessionBaseline === true
        && typeof readSessionBaseline === 'function',
    }
  }

  // Source values are accepted ONLY from the server-owned provider port and
  // only for the owner/session/source/provider/revision that was authorized.
  async function readFeatures() {
    const initial = await readAuthority()
    if (!initial.active) return null
    const source = await readSourceFeatures({ ownerId, sessionId, sourceId, providerId,
      leaseRevision: initial.revision })
    const current = await readAuthority()
    if (!current.active || current.revision !== initial.revision) return null
    const time = now()
    if (!source || source.ownerId !== ownerId || source.sessionId !== sessionId
        || source.sourceId !== sourceId || source.providerId !== providerId
        || source.leaseRevision !== initial.revision
        || source.origin !== 'recorded-feature'
        || source.serverVerified !== true
        || !finite(source.expiresAtMs) || !finite(time) || source.expiresAtMs <= time
        || !finite(source.reliability) || source.reliability < 0 || source.reliability > 1
        || Object.hasOwn(source, 'rawAudio') || Object.hasOwn(source, 'transcript')) return null
    const output = { origin: 'recorded-feature', reliability: source.reliability }
    for (const key of ['mean_f0_hz', 'energy_dbfs', 'syllables_per_second', 'pause_ratio']) {
      output[key] = finite(source[key]) ? source[key] : null
    }
    return output
  }

  async function readBaseline(requestOwnerId, speakerKey) {
    const authority = await readAuthority()
    if (!authority.active || !authority.session_baseline
        || requestOwnerId !== ownerId || !validId(speakerKey)
        || typeof readSessionBaseline !== 'function') return null
    const value = await readSessionBaseline({ ownerId, sessionId, speakerKey,
      leaseRevision: authority.revision })
    const current = await readAuthority()
    if (!current.active || !current.session_baseline
        || current.revision !== authority.revision
        || !value || value.ownerId !== ownerId || value.sessionId !== sessionId
        || value.speakerKey !== speakerKey || value.leaseRevision !== authority.revision
        || !Number.isSafeInteger(value.samples) || value.samples < 0
        || !finite(value.median_f0_hz) || !finite(value.scale_f0_hz)) return null
    return { owner_id: ownerId, speaker_key: speakerKey,
      samples: value.samples, median_f0_hz: value.median_f0_hz, scale_f0_hz: value.scale_f0_hz }
  }

  return Object.freeze({
    readAuthority, readFeatures, readBaseline,
    // Revocation MUST purge ephemeral derivative caches; a failure propagates.
    purge: () => purgeEphemeral({ ownerId, sessionId, sourceId }),
  })
}
