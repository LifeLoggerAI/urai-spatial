import assert from 'node:assert/strict'
import test from 'node:test'

import {
  evaluatePrivateSourceMediaUse,
  isPrivateSourceMediaReceipt,
} from '../src/lib/privacy/privateSourceMedia.ts'

const domain = (overrides = {}) => ({
  mode: 'granted',
  precise: false,
  replayVisible: true,
  lifeMapVisible: true,
  modelContext: true,
  sharingEnabled: false,
  likenessEnabled: false,
  ...overrides,
})

const policy = (overrides = {}) => ({
  memory: domain(),
  location: domain(),
  models: domain(),
  exports: domain(),
  identity: domain(),
  ...overrides,
})

const receipt = (overrides = {}) => ({
  version: 1,
  sourceId: 'private-source-0001',
  mediaKind: 'audio',
  sha256: 'a'.repeat(64),
  byteLength: 1024,
  durationSeconds: 30,
  immutableOriginal: true,
  storageClass: 'private-owner-vault',
  privacyClass: 'L5',
  exactLocationStoredSeparately: true,
  consent: {
    status: 'owner-attested',
    evidence: 'owner-report',
    assertedAt: '2026-09-16T00:00:00Z',
    scopes: ['archive-integrity', 'transcribe', 'memory-index', 'replay', 'life-map', 'orb-context', 'dreaming'],
  },
  ...overrides,
})

test('private source receipt requires immutable L5 source integrity metadata', () => {
  assert.equal(isPrivateSourceMediaReceipt(receipt()), true)
  assert.equal(isPrivateSourceMediaReceipt(receipt({ immutableOriginal: false })), false)
  assert.equal(isPrivateSourceMediaReceipt(receipt({ sha256: 'bad' })), false)
  assert.equal(isPrivateSourceMediaReceipt(receipt({ byteLength: 0 })), false)
})

test('archive integrity is allowed only with established scoped source consent', () => {
  assert.equal(evaluatePrivateSourceMediaUse(receipt(), policy(), 'archive-integrity').allowed, true)
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt({ consent: { ...receipt().consent, status: 'unknown' } }), policy(), 'archive-integrity').allowed,
    false,
  )
})

test('audio transcription requires source scope plus memory model and identity runtime consent', () => {
  assert.equal(evaluatePrivateSourceMediaUse(receipt(), policy(), 'transcribe').allowed, true)
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt(), policy({ models: domain({ mode: 'paused' }) }), 'transcribe').allowed,
    false,
  )
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt(), policy({ models: domain({ modelContext: false }) }), 'transcribe').allowed,
    false,
  )
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt(), policy({ identity: domain({ mode: 'paused' }) }), 'transcribe').allowed,
    false,
  )
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt({ mediaKind: 'document' }), policy(), 'transcribe').allowed,
    false,
  )
})

test('Replay and Life Map obey their specific memory visibility controls', () => {
  assert.equal(evaluatePrivateSourceMediaUse(receipt(), policy(), 'replay').allowed, true)
  assert.equal(evaluatePrivateSourceMediaUse(receipt(), policy(), 'life-map').allowed, true)
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt(), policy({ memory: domain({ replayVisible: false }) }), 'replay').allowed,
    false,
  )
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt(), policy({ memory: domain({ lifeMapVisible: false }) }), 'life-map').allowed,
    false,
  )
})

test('precise location never follows from private media alone', () => {
  const preciseScoped = receipt({ consent: { ...receipt().consent, scopes: [...receipt().consent.scopes, 'precise-location'] } })
  assert.equal(evaluatePrivateSourceMediaUse(preciseScoped, policy(), 'precise-location').allowed, false)
  assert.equal(
    evaluatePrivateSourceMediaUse(preciseScoped, policy({ location: domain({ precise: true }) }), 'precise-location').allowed,
    true,
  )
})

test('owner attestation cannot authorize public sharing likeness or voice synthesis', () => {
  const expanded = receipt({
    consent: {
      ...receipt().consent,
      scopes: [...receipt().consent.scopes, 'public-share', 'likeness', 'voice-synthesis'],
    },
  })
  const elevated = policy({
    exports: domain({ sharingEnabled: true }),
    identity: domain({ likenessEnabled: true }),
    models: domain({ modelContext: true }),
  })

  assert.equal(evaluatePrivateSourceMediaUse(expanded, elevated, 'public-share').allowed, false)
  assert.equal(evaluatePrivateSourceMediaUse(expanded, elevated, 'likeness').allowed, false)
  assert.equal(evaluatePrivateSourceMediaUse(expanded, elevated, 'voice-synthesis').allowed, false)
})

test('direct-subject consent plus runtime permissions can authorize high-risk uses', () => {
  const direct = receipt({
    consent: {
      ...receipt().consent,
      status: 'direct-subject',
      evidence: 'subject',
      scopes: [...receipt().consent.scopes, 'public-share', 'likeness', 'voice-synthesis'],
    },
  })
  const elevated = policy({
    exports: domain({ sharingEnabled: true }),
    identity: domain({ likenessEnabled: true }),
    models: domain({ modelContext: true }),
  })

  assert.equal(evaluatePrivateSourceMediaUse(direct, elevated, 'public-share').allowed, true)
  assert.equal(evaluatePrivateSourceMediaUse(direct, elevated, 'likeness').allowed, true)
  assert.equal(evaluatePrivateSourceMediaUse(direct, elevated, 'voice-synthesis').allowed, true)
  assert.equal(evaluatePrivateSourceMediaUse({ ...direct, mediaKind: 'image' }, elevated, 'voice-synthesis').allowed, false)
})

test('revocation overrides previously granted runtime policy', () => {
  const revoked = receipt({ consent: { ...receipt().consent, status: 'revoked' } })
  assert.equal(evaluatePrivateSourceMediaUse(revoked, policy(), 'replay').allowed, false)
  assert.match(evaluatePrivateSourceMediaUse(revoked, policy(), 'replay').reasons.join(' '), /revoked/)
})
