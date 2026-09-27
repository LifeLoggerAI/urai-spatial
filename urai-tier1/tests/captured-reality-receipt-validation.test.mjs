import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const validator = fileURLToPath(new URL('../../scripts/validate-captured-reality-receipt.mjs', import.meta.url))
const readiness = JSON.parse(fs.readFileSync(new URL('../../operations/captured-reality/launch-readiness-v1.json', import.meta.url), 'utf8'))
const boundary = JSON.parse(fs.readFileSync(new URL('../../operations/captured-reality/parents-house-source-boundary-v1.json', import.meta.url), 'utf8'))
function validate(t, receipt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-receipt-test-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'receipt.json')
  fs.writeFileSync(file, JSON.stringify(receipt))
  return spawnSync(process.execPath, [validator, file], { encoding: 'utf8' })
}

test('existing honest blocked readiness and immutable source boundary validate', t => {
  for (const receipt of [readiness, boundary]) assert.equal(validate(t, receipt).status, 0)
})
test('unknown schemas cannot claim success by sharing a name prefix', t => {
  for (const receipt of [null, {}, { schemaVersion: 'urai-captured-reality-unknown-1', launchClassification: 'LAUNCH_READY' }]) assert.notEqual(validate(t, receipt).status, 0)
})
test('a trained-scene flag alone cannot certify launch', t => {
  const falseReady = structuredClone(readiness)
  falseReady.reconstruction.trainedSceneExists = true
  falseReady.reconstruction.visualQaExists = false
  falseReady.launchClassification = 'LAUNCH_READY'
  const result = validate(t, falseReady)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /visual QA/)
  assert.match(result.stderr, /deployed private scene delivery/)
})

function launchFixture() {
  const receipt = structuredClone(readiness)
  receipt.launchClassification = 'LAUNCH_READY'
  receipt.allowedClaim = 'Synthetic validation fixture only'
  receipt.sourceAuthority.reconstructionReady = true
  Object.assign(receipt.reconstruction, {
    trainedSceneExists: true, completeSceneExists: true, visualQaExists: true,
    visualAcceptance: true, metricScaleEstablished: true, remainingGates: [],
  })
  Object.assign(receipt.browser, {
    routeMounted: true, performanceReceiptExists: true,
    productionDeploymentVerified: true, privateSceneDeliveryVerified: true,
  })
  receipt.mobile.performanceReceiptExists = true
  return receipt
}

test('a fully evidenced synthetic launch fixture validates', t => {
  assert.equal(validate(t, launchFixture()).status, 0)
})

test('partial reconstruction cannot launch even when prior browser and mobile gates pass', t => {
  for (const key of ['trainedSceneExists', 'completeSceneExists', 'visualQaExists', 'visualAcceptance', 'metricScaleEstablished']) {
    for (const value of [false, undefined, 'true']) {
      const receipt = launchFixture()
      receipt.reconstruction[key] = value
      assert.notEqual(validate(t, receipt).status, 0, `${key}=${String(value)} must block launch`)
    }
  }
  for (const remainingGates of [['independent-visual-and-release-acceptance'], null, undefined, {}]) {
    const receipt = launchFixture()
    receipt.reconstruction.remainingGates = remainingGates
    assert.notEqual(validate(t, receipt).status, 0, 'missing or outstanding gates must block launch')
  }
})
test('source count must match nonempty positive byte evidence', t => {
  for (const observedByteSizes of [[], [1], [1, 2, -3], null]) assert.notEqual(validate(t, { ...boundary, observedByteSizes }).status, 0)
})
test('technical integrity receipts cannot promote themselves to launch acceptance', t => {
  const receipt = { schemaVersion: 'urai-captured-reality-splat-integrity-1', classification: 'TECHNICAL_BINARY_VALIDATION_ONLY', pointCount: 1, byteSize: 32, visiblePoints: 1, sha256: 'a'.repeat(64), budgets: { maxBytes: 32, maxPoints: 1 }, sourceAuthenticityVerified: false, visualAcceptanceEstablished: false, devicePerformanceCertified: false, launchReady: false }
  assert.equal(validate(t, receipt).status, 0)
  for (const key of ['sourceAuthenticityVerified', 'visualAcceptanceEstablished', 'devicePerformanceCertified', 'launchReady']) assert.notEqual(validate(t, { ...receipt, [key]: true }).status, 0)
})
