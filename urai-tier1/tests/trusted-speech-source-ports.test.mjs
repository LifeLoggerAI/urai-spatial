import assert from 'node:assert/strict'
import test from 'node:test'
import { createTrustedSpeechSourcePorts } from '../src/lib/speechInference/trustedSourcePorts.mjs'

const ownerId = 'owner-A', sessionId = 'session-A', sourceId = 'source-A', providerId = 'provider-A'
function fixture(overrides = {}) {
  let time = 2000, purges = 0, sourceReads = 0, baselineReads = 0
  const policy = { version: 2, ownerId, revision: 6,
    enforcement: { state: 'fully-enforced' },
    domains: { models: { mode: 'granted', modelContext: true } } }
  const lease = { schemaVersion: 'urai-speech-lease-v1', ownerId, sessionId, sourceId, providerId,
    policyRevision: 6, revision: 3, active: true, issuedAtMs: 1000, expiresAtMs: 5000,
    transcription: true, inference: true, sessionBaseline: false }
  const source = { ownerId, sessionId, sourceId, providerId, leaseRevision: 3,
    origin: 'recorded-feature', serverVerified: true, expiresAtMs: 4500, reliability: .94,
    mean_f0_hz: 210, energy_dbfs: -11, syllables_per_second: 3.5, pause_ratio: .2 }
  const baseline = { ownerId, sessionId, speakerKey: 'speaker-A', leaseRevision: 3,
    samples: 10, median_f0_hz: 201, scale_f0_hz: 12 }
  const ports = createTrustedSpeechSourcePorts({
    ownerId, sessionId, sourceId, providerId,
    readPrivacyPolicy: async () => overrides.policy ?? policy,
    readSpeechLease: async () => overrides.lease ?? lease,
    readSourceFeatures: async () => { sourceReads++; return overrides.source ?? source },
    readSessionBaseline: async () => { baselineReads++; return overrides.baseline ?? baseline },
    purgeEphemeral: async () => { purges++; if (overrides.purgeError) throw Error('PURGE_FAILED') },
    now: () => overrides.time ?? time,
  })
  return { ports, policy, lease, source, baseline,
    get reads() { return { source: sourceReads, baseline: baselineReads, purges } },
    setTime(next) { time = next } }
}

test('separate exact-session speech lease is required; no source read on denied authority', async () => {
  for (const altered of [
    { active: false }, { transcription: false }, { inference: false },
    { ownerId: 'other-owner' }, { sessionId: 'other-session' },
    { sourceId: 'other-source' }, { providerId: 'other-provider' },
    { policyRevision: 7 }, { issuedAtMs: 2500 }, { expiresAtMs: 2000 },
    { expiresAtMs: 9999999999 }, { revision: -1 },
  ]) {
    const f = fixture(); const lease = { ...f.lease, ...altered }
    const probe = fixture({ lease })
    assert.equal((await probe.ports.readAuthority()).active, false)
    assert.equal(await probe.ports.readFeatures(), null)
    assert.equal(probe.reads.source, 0)
  }
})

test('broad models grant does not override absent or weak speech consent', async () => {
  const f = fixture()
  const absent = fixture({ lease: null })
  assert.equal((await absent.ports.readAuthority()).active, false)
  const partial = fixture({ lease: { ...f.lease, inference: false } })
  assert.equal((await partial.ports.readAuthority()).active, false)
})

test('canonical policy, enforcement and model context are required separately', async () => {
  const f = fixture()
  for (const policy of [
    { ...f.policy, ownerId: 'other-owner' },
    { ...f.policy, revision: 7 },
    { ...f.policy, enforcement: { state: 'pending' } },
    { ...f.policy, domains: { models: { mode: 'paused', modelContext: true } } },
    { ...f.policy, domains: { models: { mode: 'granted', modelContext: false } } },
    { ...f.policy, version: 1 },
  ]) {
    const probe = fixture({ policy })
    assert.equal((await probe.ports.readAuthority()).active, false)
  }
})

test('authorized source feature projection excludes untrusted raw speech', async () => {
  const f = fixture()
  assert.deepEqual(await f.ports.readFeatures(), {
    origin: 'recorded-feature', reliability: .94, mean_f0_hz: 210,
    energy_dbfs: -11, syllables_per_second: 3.5, pause_ratio: .2,
  })
  assert.equal(f.reads.source, 1)
  const injected = fixture({ source: { ...f.source, rawAudio: 'sensitive' } })
  assert.equal(await injected.ports.readFeatures(), null)
  const transcript = fixture({ source: { ...f.source, transcript: 'private words' } })
  assert.equal(await transcript.ports.readFeatures(), null)
})

test('source identity, revision, expiry, server verification and reliability fail closed', async () => {
  const f = fixture()
  for (const altered of [
    { ownerId: 'other' }, { sessionId: 'other' }, { sourceId: 'other' },
    { providerId: 'other' }, { leaseRevision: 4 }, { serverVerified: false },
    { origin: 'synthetic-feature-stub' }, { expiresAtMs: 1500 },
    { reliability: 1.2 }, { reliability: NaN },
  ]) {
    const probe = fixture({ source: { ...f.source, ...altered } })
    assert.equal(await probe.ports.readFeatures(), null)
  }
})

test('revocation and time expiry deny source reads', async () => {
  const f = fixture(); f.setTime(5000)
  assert.equal((await f.ports.readAuthority()).active, false)
  assert.equal(await f.ports.readFeatures(), null)
  assert.equal(f.reads.source, 0)
})

test('baseline is independently denied unless separate purpose is granted', async () => {
  const f = fixture()
  assert.equal((await f.ports.readAuthority()).session_baseline, false)
  assert.equal(await f.ports.readBaseline(ownerId, 'speaker-A'), null)
  assert.equal(f.reads.baseline, 0)
  const enabled = fixture({ lease: { ...f.lease, sessionBaseline: true } })
  assert.deepEqual(await enabled.ports.readBaseline(ownerId, 'speaker-A'), {
    owner_id: ownerId, speaker_key: 'speaker-A', samples: 10,
    median_f0_hz: 201, scale_f0_hz: 12,
  })
  assert.equal(await enabled.ports.readBaseline('other-owner', 'speaker-A'), null)
  assert.equal(await enabled.ports.readBaseline(ownerId, '../malformed'), null)
})

test('stale baseline and incompatible session never cross authorization boundary', async () => {
  const f = fixture()
  const stale = fixture({ lease: { ...f.lease, sessionBaseline: true },
    baseline: { ...f.baseline, leaseRevision: 2 } })
  assert.equal(await stale.ports.readBaseline(ownerId, 'speaker-A'), null)
})

test('purge is required and failures are not swallowed', async () => {
  const f = fixture()
  await f.ports.purge()
  assert.equal(f.reads.purges, 1)
  await assert.rejects(fixture({ purgeError: true }).ports.purge(), /PURGE_FAILED/)
})

test('untrusted provider/source callbacks cannot be omitted', () => {
  assert.throws(() => createTrustedSpeechSourcePorts({ ownerId, sessionId, sourceId, providerId }), /SPEECH_TRUSTED_SOURCE_PORTS_REQUIRED/)
})
