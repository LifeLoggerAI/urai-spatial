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
  assert.equal(manifest.runtime.featureFlag, 'URAI_ENABLE_INTERPRETIVE_WORLDS')
  assert.equal(manifest.runtime.promotionState, 'hard-off')
})

test('all synthetic survey passes remain unaccepted and S06 retains its literal motion rejection', () => {
  assert.equal(manifest.surveyPasses.length, 8)
  for (const pass of manifest.surveyPasses) {
    assert.match(pass.taskId, /^[0-9a-f-]{36}$/)
    assert.equal(pass.acceptance, pass.id === 'S06_CCW_ARC' ? 'rejected' : 'pending')
    assert.ok(pass.seconds >= 6)
  }
  const inspection = JSON.parse(fs.readFileSync(new URL('../../operations/captured-reality/worlds/URAI-IW-001-QUIET-RESET/survey-inspection.current.json', import.meta.url), 'utf8'))
  const rejected = manifest.surveyPasses.find(pass => pass.id === 'S06_CCW_ARC')
  assert.equal(inspection.inspection.rejectedTaskId, rejected.taskId)
  assert.equal(inspection.inspection.reconstructionAuthorized, false)
  assert.equal(inspection.independentAcceptance, false)
  assert.equal(inspection.generationPerformed, false)
  assert.match(inspection.inspection.rejection, /two simultaneous distinct bright sun discs/)
  assert.equal(inspection.media.find(media => media.taskId === rejected.taskId).sha256,
    '7c441028172c52b2ab57e26ec525628915be44e475fa3affd7c5d7295a367f0f')
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
