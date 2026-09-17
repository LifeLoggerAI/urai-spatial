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

test('transcription requires source scope plus memory and model runtime consent', () => {
  assert.equal(evaluatePrivateSourceMediaUse(receipt(), policy(), 'transcribe').allowed, true)
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt(), policy({ models: domain({ mode: 'paused' }) }), 'transcribe').allowed,
    false,
  )
  assert.equal(
    evaluatePrivateSourceMediaUse(receipt(), policy({ models: domain({ modelContext: false }) }), 'transcribe').allowed,
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
  assert.equal(evaluatePrivateSourceMediaUse(receipt({ consent: { ...receipt().consent, scopes: [...receipt().consent.scopes, 'precise-location'] } }), policy(), 'precise-location').allowed, false)
  assert.equal(
    evaluatePrivateSourceMediaUse(
      receipt({ consent: { ...receipt().consent, scopes: [...receipt().consent.scopes, 'precise-location'] } }),
      policy({ location: domain({ precise: true }) }),
      'precise-location',
    ).allowed,
    true,
  )
})

test('public sharing, likeness and voice synthesis are separately gated and denied by default', () => {
  const expanded = receipt({
    consent: {
      ...receipt().consent,
      scopes: [...receipt().consent.scopes, 'public-share', 'likeness', 'voice-synthesis'],
    },
  })
  assert.equal(evaluatePrivateSourceMediaUse(expanded, policy(), 'public-share').allowed, false)
  assert.equal(evaluatePrivateSourceMediaUse(expanded, policy(), 'likeness').allowed, false)
  assert.equal(evaluatePrivateSourceMediaUse(expanded, policy(), 'voice-synthesis').allowed, false)

  const elevated = policy({
    exports: domain({ sharingEnabled: true }),
    identity: domain({ likenessEnabled: true }),
    models: domain({ modelContext: true }),
  })
  assert.equal(evaluatePrivateSourceMediaUse(expanded, elevated, 'public-share').allowed, true)
  assert.equal(evaluatePrivateSourceMediaUse(expanded, elevated, 'likeness').allowed, true)
  assert.equal(evaluatePrivateSourceMediaUse(expanded, elevated, 'voice-synthesis').allowed, true)
})

test('revocation overrides previously granted runtime policy', () => {
  const revoked = receipt({ consent: { ...receipt().consent, status: 'revoked' } })
  assert.equal(evaluatePrivateSourceMediaUse(revoked, policy(), 'replay').allowed, false)
  assert.match(evaluatePrivateSourceMediaUse(revoked, policy(), 'replay').reasons.join(' '), /revoked/)
})
