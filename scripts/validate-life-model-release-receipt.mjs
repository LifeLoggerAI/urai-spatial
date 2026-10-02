import fs from 'node:fs'
import process from 'node:process'

const path = process.argv[2] || 'operations/life-model/release-receipt-v1.json'
const strict = process.argv.includes('--strict')
const receipt = JSON.parse(fs.readFileSync(path, 'utf8'))

const fail = (message) => { console.error(`[FAIL] ${message}`); process.exitCode = 1 }
const pass = (message) => console.log(`[PASS] ${message}`)

if (receipt.schemaVersion !== 'urai-life-model-release-receipt-v1') fail('unsupported release receipt schema')
else pass('release receipt schema')

const required = [
  'sourceIngestionE2E','lifeCausalGraph','personWorldCompilation','replayBinding','lifeMovieBinding',
  'capturedRealityBinding','personPresence','syntheticMemoryFirewall','correctionPropagation',
  'consentRevocation','exportDeletion','privacy','security','accessibility','localization',
  'device','xr','literalQuality','identityAcceptance','independentApproval','deployment','productionReverification',
]
for (const gate of required) {
  if (!receipt.gates || typeof receipt.gates[gate] !== 'string' || !receipt.gates[gate]) fail(`missing gate: ${gate}`)
}
if (!Array.isArray(receipt.receiptRefs) || !Array.isArray(receipt.humanApprovalRefs)) fail('receipt references are invalid')
if (receipt.certified === true && !/^[0-9a-f]{40}$/.test(String(receipt.candidateSha || ''))) {
  fail('certified receipt requires exact 40-character candidate SHA')
}
if (receipt.certified !== true) pass('receipt correctly remains fail-closed')

if (strict) {
  const expectedSha = String(process.env.GITHUB_SHA || process.env.CANDIDATE_SHA || '')
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) fail('strict validation requires exact GITHUB_SHA/CANDIDATE_SHA')
  if (receipt.candidateSha !== expectedSha) fail('receipt candidate SHA does not match exact validated SHA')
  if (receipt.certified !== true) fail('strict launch certification requires certified=true')

  const terminal = {
    sourceIngestionE2E: 'ACCEPTED',
    lifeCausalGraph: 'ACCEPTED',
    personWorldCompilation: 'ACCEPTED',
    replayBinding: 'ACCEPTED',
    lifeMovieBinding: 'ACCEPTED',
    capturedRealityBinding: 'ACCEPTED',
    personPresence: 'ACCEPTED',
    syntheticMemoryFirewall: 'ACCEPTED',
    correctionPropagation: 'ACCEPTED',
    consentRevocation: 'ACCEPTED',
    exportDeletion: 'ACCEPTED',
    privacy: 'ACCEPTED',
    security: 'ACCEPTED',
    accessibility: 'ACCEPTED',
    localization: 'ACCEPTED',
    device: 'ACCEPTED',
    xr: 'ACCEPTED',
    literalQuality: 'ACCEPTED',
    identityAcceptance: 'ACCEPTED',
    independentApproval: 'APPROVED',
    deployment: 'DEPLOYED_EXACT_SHA',
    productionReverification: 'ACCEPTED',
  }
  for (const [gate, expected] of Object.entries(terminal)) {
    if (receipt.gates?.[gate] !== expected) fail(`gate ${gate} is ${receipt.gates?.[gate] ?? 'missing'}; expected ${expected}`)
  }
  if (!receipt.receiptRefs.length) fail('strict certification requires retained machine/runtime receipt refs')
  if (!receipt.humanApprovalRefs.length) fail('strict certification requires human approval refs')
  if (!receipt.deploymentRef) fail('strict certification requires deployment reference')
  if (!receipt.productionFingerprint) fail('strict certification requires production fingerprint')
}

if (!process.exitCode) console.log(strict ? '[PASS] LIFE_MODEL_RELEASE_CERTIFIED' : '[PASS] LIFE_MODEL_RELEASE_RECEIPT_CONTRACT')
