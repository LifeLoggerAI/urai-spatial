#!/usr/bin/env node
import fs from 'node:fs'

const path = process.argv[2]
if (!path) throw new Error('usage: validate-captured-reality-receipt.mjs <receipt.json>')
const receipt = JSON.parse(fs.readFileSync(path, 'utf8'))
const failures = []
const need = (ok, message) => { if (!ok) failures.push(message) }

const supportedSchemas = new Set([
  'urai-captured-reality-launch-readiness-1',
  'urai-captured-reality-source-boundary-receipt-1',
  'urai-captured-reality-splat-integrity-1',
])
need(receipt && typeof receipt === 'object' && supportedSchemas.has(receipt.schemaVersion), 'supported captured reality receipt schemaVersion required')

if (receipt?.schemaVersion === 'urai-captured-reality-launch-readiness-1') {
  need(receipt.reconstruction && typeof receipt.reconstruction.trainedSceneExists === 'boolean', 'trainedSceneExists required')
  need(receipt.browser && typeof receipt.browser.routeMounted === 'boolean', 'browser routeMounted required')
  need(['NOT_YET_LAUNCH_ENABLED', 'LAUNCH_READY'].includes(receipt.launchClassification), 'recognized launch classification required')
  if (receipt.reconstruction?.trainedSceneExists !== true) {
    need(receipt.launchClassification !== 'LAUNCH_READY', 'cannot claim LAUNCH_READY without a trained scene')
  }
  if (receipt.browser?.performanceReceiptExists !== true) {
    need(!/browser certified/i.test(String(receipt.allowedClaim || '')), 'cannot claim browser certification without performance receipt')
  }
  if (receipt.xr?.performanceReceiptExists !== true) {
    need(!/XR certified/i.test(String(receipt.allowedClaim || '')), 'cannot claim XR certification without device receipt')
  }
  if (receipt.launchClassification === 'LAUNCH_READY') {
    need(receipt.sourceAuthority?.reconstructionReady === true, 'launch requires reconstruction-ready source authority')
    need(receipt.reconstruction?.visualQaExists === true, 'launch requires reconstruction visual QA')
    need(receipt.browser?.routeMounted === true && receipt.browser?.performanceReceiptExists === true, 'launch requires mounted browser runtime and performance evidence')
    need(receipt.browser?.productionDeploymentVerified === true && receipt.browser?.privateSceneDeliveryVerified === true, 'launch requires deployed private scene delivery')
    need(receipt.mobile?.performanceReceiptExists === true, 'launch requires mobile performance evidence')
  }
}

if (receipt?.schemaVersion === 'urai-captured-reality-source-boundary-receipt-1') {
  need(Number.isSafeInteger(receipt.sourceCount) && receipt.sourceCount > 0, 'sourceCount must be a positive integer')
  need(receipt.originalMutationPerformed === false, 'source authority must remain immutable')
  need(receipt.reconstructionClaimed === false, 'source receipt cannot masquerade as reconstruction receipt')
  need(Array.isArray(receipt.observedByteSizes) && receipt.observedByteSizes.length === receipt.sourceCount && receipt.observedByteSizes.every((value) => Number.isSafeInteger(value) && value > 0), 'matching source count and valid observed byte sizes required')
}

if (receipt?.schemaVersion === 'urai-captured-reality-splat-integrity-1') {
  need(receipt.classification === 'TECHNICAL_BINARY_VALIDATION_ONLY', 'binary inspection cannot certify reconstruction')
  need(Number.isSafeInteger(receipt.pointCount) && receipt.pointCount > 0 && receipt.byteSize === receipt.pointCount * 32, 'complete 32-byte splat records required')
  need(/^[a-f0-9]{64}$/.test(receipt.sha256), 'exact splat checksum required')
  need(Number.isSafeInteger(receipt.visiblePoints) && receipt.visiblePoints > 0 && receipt.visiblePoints <= receipt.pointCount, 'visible point count required')
  for (const key of ['maxBytes', 'maxPoints']) need(Number.isSafeInteger(receipt.budgets?.[key]) && receipt.budgets[key] > 0, 'explicit device budgets required')
  need(receipt.byteSize <= receipt.budgets?.maxBytes && receipt.pointCount <= receipt.budgets?.maxPoints, 'splat must remain within declared budgets')
  for (const key of ['sourceAuthenticityVerified', 'visualAcceptanceEstablished', 'devicePerformanceCertified', 'launchReady']) need(receipt[key] === false, `technical binary inspection cannot establish ${key}`)
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, schemaVersion: receipt.schemaVersion }, null, 2))
