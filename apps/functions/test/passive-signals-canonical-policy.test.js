const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')

// Execute the exact existing deterministic transaction fixture and the actual
// compiled passive handler. This is a synthetic SDK terminal, not an emulator.
const fixtureFile = path.join(__dirname, 'passive-signals-location-consent.test.js')
const text = fs.readFileSync(fixtureFile, 'utf8')
const boundary = text.indexOf("for (const precision of ['approximate'")
assert.ok(boundary > 0, 'Exact retained transaction fixture is required')
const holder = { exports: {} }
vm.runInNewContext(text.slice(0, boundary) + '\nmodule.exports = { fixture, canonicalPolicy, uid };', {
  require, module: holder, exports: holder.exports, __dirname, process,
  structuredClone, Buffer, console,
}, { filename: fixtureFile })
const { fixture, canonicalPolicy, uid } = holder.exports
const types = ['session-activity', 'stillness', 'late-night', 'quick-cancel', 'motion',
  'location', 'ambient-tag', 'steps', 'voice-interaction', 'camera-emotion']
const allGranted = () => canonicalPolicy(uid, Object.fromEntries(
  ['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(domain => [domain, {
    mode: 'granted', precise: true, automationEnabled: true, modelContext: true, likenessEnabled: true,
  }]),
))
const signalPayload = type => ({
  source: 'synthetic-source', label: 'Synthetic consent test only',
  confidence: 0.9, activity: 'synthetic', durationMs: 10000, localHour: 22,
  timezoneOffsetMinutes: 0, count: 1, windowMs: 1000, intensity: 2, sampleWindowMs: 1000,
  deviceMotion: true, latitude: 37.4219999, longitude: -122.0840575,
  accuracyMeters: 8, precision: 'precise', tags: ['synthetic'], steps: 3, intervalMinutes: 1,
  transcript: 'Synthetic transcript', toneTag: 'calm', emotionTag: 'calm', colorTag: 'blue',
  rawAudio: 'must-not-store', rawImage: 'must-not-store',
  consent: { authorized: true }, domains: allGranted().domains,
})
const mutations = [
  ['null-policy', () => null],
  ['array-policy', () => []],
  ['scalar-policy', () => 'granted'],
  ['domains-only', p => ({ domains: p.domains })],
  ['foreign-owner', p => ({ ...p, ownerId: 'synthetic-other-owner' })],
  ['missing-owner', p => { delete p.ownerId; return p }],
  ['old-version', p => ({ ...p, version: 1 })],
  ['missing-version', p => { delete p.version; return p }],
  ['missing-revision', p => { delete p.revision; return p }],
  ['string-revision', p => ({ ...p, revision: '1' })],
  ['fractional-revision', p => ({ ...p, revision: 1.5 })],
  ['unsafe-revision', p => ({ ...p, revision: Number.MAX_SAFE_INTEGER + 1 })],
  ['negative-revision', p => ({ ...p, revision: -1 })],
  ['missing-unrelated-domain', p => { delete p.domains.exports; return p }],
  ['unknown-domain', p => { p.domains.unknown = p.domains.workforce; return p }],
  ['missing-permission', p => { delete p.domains.location.precise; return p }],
  ['malformed-boolean', p => { p.domains.location.precise = 'true'; return p }],
  ['invalid-retention', p => { p.domains.workforce.retentionDays = '30'; return p }],
  ['unknown-permission', p => { p.domains.workforce.callerAuthorized = true; return p }],
  ['missing-enforcement', p => { delete p.enforcement; return p }],
  ['missing-enforcement-job', p => { delete p.enforcement.jobId; return p }],
  ['missing-enforcement-targets', p => { delete p.enforcement.affectedTargets; return p }],
  ['missing-enforcement-provider', p => { delete p.enforcement.providerState; return p }],
  ['unknown-enforcement-state', p => { p.enforcement.state = 'approved-by-caller'; return p }],
  ['unknown-provider-state', p => { p.enforcement.providerState = 'approved'; return p }],
  ['duplicate-targets', p => { p.enforcement.affectedTargets = ['synthetic', 'synthetic']; return p }],
  ['nonstring-target', p => { p.enforcement.affectedTargets = [1]; return p }],
  ['unknown-top-level-authority', p => ({ ...p, accepted: true })],
]
for (const [name, mutate] of mutations) {
  for (const type of types) {
    test('canonical stored consent denies ' + name + ' for ' + type, async () => {
      const malformed = mutate(allGranted())
      const f = await fixture({}, true, { policyRecord: malformed })
      await assert.rejects(f.record(signalPayload(type), undefined, { type }), {
        code: 'permission-denied', message: 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED',
      })
      assert.equal(f.writes.length, 0)
      assert.equal(f.stagedWrites.length, 0)
      assert.equal(f.logs.length, 0)
      assert.equal(f.transactionAttempts(), 1)
      assert.deepEqual(Array.from(f.reads), ['users/' + uid + '/privacyPolicy/current'])
    })
  }
}
for (const state of ['pending', 'partially-enforced', 'failed', 'conflicted']) {
  for (const type of types) {
    test('valid policy with ' + state + ' enforcement denies ' + type, async () => {
      const p = allGranted(); p.enforcement.state = state
      const f = await fixture({}, true, { policyRecord: p })
      await assert.rejects(f.record(signalPayload(type), undefined, { type }), {
        code: 'permission-denied', message: 'PASSIVE_SIGNAL_ENFORCEMENT_REQUIRED',
      })
      assert.equal(f.writes.length, 0)
      assert.equal(f.stagedWrites.length, 0)
      assert.equal(f.logs.length, 0)
    })
  }
}
for (const mode of ['granted', 'limited']) {
  for (const type of types) {
    test('canonical ' + mode + ' owner authority retains existing ' + type + ' behavior', async () => {
      const p = allGranted()
      for (const domain of Object.values(p.domains)) domain.mode = mode
      const f = await fixture({}, true, { policyRecord: p })
      const result = await f.record(signalPayload(type), undefined, { type })
      assert.equal(result.accepted, true)
      assert.equal(f.writes.length, 1)
      assert.equal(f.writes[0].data.ownerId, uid)
      assert.equal(f.writes[0].data.type, type)
      assert.equal(f.writes[0].data.rawMediaStored, false)
      assert.equal(f.writes[0].data.privacyClass, ['voice-interaction', 'camera-emotion'].includes(type) ? 'sensitive' : 'private')
      assert.equal(Object.hasOwn(f.writes[0].data.payload, 'rawAudio'), false)
      assert.equal(Object.hasOwn(f.writes[0].data.payload, 'rawImage'), false)
      assert.equal(Object.hasOwn(f.writes[0].data.payload, 'consent'), false)
      assert.equal(Object.hasOwn(f.writes[0].data.payload, 'domains'), false)
      assert.equal(f.transactionAttempts(), 1)
      assert.equal(f.logs.length, 0)
    })
  }
}
for (const type of types) {
  test('pure canonical validation does not change supported zero-revision ' + type + ' semantics', async () => {
    const p = allGranted(); p.revision = 0
    const f = await fixture({}, true, { policyRecord: p })
    const result = await f.record(signalPayload(type), undefined, { type })
    assert.equal(result.accepted, true)
    assert.equal(f.writes.length, 1)
  })
}
const conflicts = [
  ['foreign-owner', p => ({ ...p, ownerId: 'synthetic-other-owner' }), 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED'],
  ['domains-only', p => ({ domains: p.domains }), 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED'],
  ['missing-unrelated-domain', p => { delete p.domains.exports; return p }, 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED'],
  ['malformed-boolean', p => { p.domains.location.precise = 'true'; return p }, 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED'],
  ['pending-enforcement', p => { p.enforcement.state = 'pending'; return p }, 'PASSIVE_SIGNAL_ENFORCEMENT_REQUIRED'],
  ['failed-enforcement', p => { p.enforcement.state = 'failed'; return p }, 'PASSIVE_SIGNAL_ENFORCEMENT_REQUIRED'],
]
for (const [name, mutate, message] of conflicts) {
  for (const type of ['location', 'voice-interaction', 'camera-emotion', 'motion']) {
    test('transaction retry denies ' + name + ' during ' + type + ' retention', async () => {
      const f = await fixture({}, true, {
        policyRecord: allGranted(),
        beforeCommit: changePolicy => changePolicy(undefined, true, mutate(allGranted())),
      })
      await assert.rejects(f.record(signalPayload(type), undefined, { type }), { code: 'permission-denied', message })
      assert.equal(f.writes.length, 0)
      assert.equal(f.stagedWrites.length, 1)
      assert.equal(f.transactionAttempts(), 2)
      assert.equal(f.allocatedIds.length, 1)
      assert.equal(f.logs.length, 0)
      assert.equal(f.reads.length, 2)
    })
  }
}
