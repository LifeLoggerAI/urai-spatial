#!/usr/bin/env node
import fs from 'node:fs'

const path = process.argv[2]
if (!path) throw new Error('usage: validate-captured-reality-receipt.mjs <receipt.json>')
const receipt = JSON.parse(fs.readFileSync(path, 'utf8'))
const failures = []
const need = (ok, message) => { if (!ok) failures.push(message) }

need(typeof receipt.schemaVersion === 'string' && receipt.schemaVersion.startsWith('urai-captured-reality-'), 'captured reality schemaVersion required')

if (receipt.schemaVersion === 'urai-captured-reality-launch-readiness-1') {
  need(receipt.reconstruction && typeof receipt.reconstruction.trainedSceneExists === 'boolean', 'trainedSceneExists required')
  need(receipt.browser && typeof receipt.browser.routeMounted === 'boolean', 'browser routeMounted required')
  if (receipt.reconstruction.trainedSceneExists !== true) {
    need(receipt.launchClassification !== 'LAUNCH_READY', 'cannot claim LAUNCH_READY without a trained scene')
  }
  if (receipt.browser.performanceReceiptExists !== true) {
    need(!/browser certified/i.test(String(receipt.allowedClaim || '')), 'cannot claim browser certification without performance receipt')
  }
  if (receipt.xr.performanceReceiptExists !== true) {
    need(!/XR certified/i.test(String(receipt.allowedClaim || '')), 'cannot claim XR certification without device receipt')
  }
}

if (receipt.schemaVersion === 'urai-captured-reality-source-boundary-receipt-1') {
  need(receipt.sourceCount > 0, 'sourceCount must be positive')
  need(receipt.originalMutationPerformed === false, 'source authority must remain immutable')
  need(receipt.reconstructionClaimed === false, 'source receipt cannot masquerade as reconstruction receipt')
  need(receipt.observedByteSizes.every((value) => Number.isSafeInteger(value) && value > 0), 'valid observed byte sizes required')
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, schemaVersion: receipt.schemaVersion }, null, 2))
