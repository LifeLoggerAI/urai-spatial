import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const manifestUrl = new URL('../../operations/captured-reality/worlds/URAI-IW-001-QUIET-RESET/manifest.json', import.meta.url)
const manifest = JSON.parse(fs.readFileSync(manifestUrl, 'utf8'))

test('interpretive generated world can never claim autobiographical recorded-source truth', () => {
  assert.equal(manifest.truthClass, 'interpretive')
  assert.equal(manifest.autobiographical, false)
  assert.equal(manifest.generatedOnly, true)
  assert.equal(manifest.sourceTruthEligible, false)
  assert.deepEqual(manifest.sourceIds, [])
  assert.match(manifest.truthLabel, /not camera-recorded history/i)
})

test('world 001 remains hard-off until literal review and reconstruction gates are complete', () => {
  assert.equal(manifest.canonicalVisualSeed.visualAcceptance, 'pending-literal-review')
  assert.equal(manifest.reconstruction.state, 'not-started')
  assert.equal(manifest.runtime.featureFlag, 'URAI_ENABLE_CAPTURED_REALITY')
  assert.equal(manifest.runtime.promotionState, 'hard-off')
})

test('all synthetic survey passes retain explicit pending acceptance', () => {
  assert.equal(manifest.surveyPasses.length, 8)
  for (const pass of manifest.surveyPasses) {
    assert.match(pass.taskId, /^[0-9a-f-]{36}$/)
    assert.equal(pass.acceptance, 'pending')
    assert.ok(pass.seconds >= 6)
  }
})

test('generated interpretive lane contains no exact private-location claim', () => {
  assert.equal(manifest.exactPrivateLocationEmbedded, false)
  assert.doesNotMatch(JSON.stringify(manifest), /Parents.? House/i)
})

test('runtime budgets preserve the existing captured-reality launch contract', () => {
  assert.equal(manifest.runtime.mobile.maxBytes, 64 * 1024 * 1024)
  assert.equal(manifest.runtime.mobile.targetFps, 30)
  assert.equal(manifest.runtime.desktop.maxBytes, 160 * 1024 * 1024)
  assert.equal(manifest.runtime.desktop.targetFps, 45)
  assert.equal(manifest.runtime.xr.maxBytes, 96 * 1024 * 1024)
  assert.equal(manifest.runtime.xr.targetFps, 72)
  assert.match(manifest.runtime.xr.certification, /physical-device/i)
})

test('pilot spend remains bounded and does not imply top-up authority', () => {
  assert.equal(manifest.spend.pilotCeilingCredits, 1200)
  assert.equal(manifest.spend.topUpPerformed, false)
  assert.ok(manifest.spend.packetStartCredits > manifest.spend.lowestObservedReservedBalanceAfterSubmission)
  assert.ok(
    manifest.spend.packetStartCredits - manifest.spend.lowestObservedReservedBalanceAfterSubmission
      <= manifest.spend.pilotCeilingCredits,
  )
})
