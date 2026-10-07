import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const receipt = JSON.parse(fs.readFileSync(new URL('../../operations/life-model/release-receipt-v1.json', import.meta.url), 'utf8'))
const validator = fs.readFileSync(new URL('../../scripts/validate-life-model-release-receipt.mjs', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../../.github/workflows/life-model-release-gate.yml', import.meta.url), 'utf8')

test('Life Model release receipt is fail-closed until real acceptance exists', () => {
  assert.equal(receipt.certified, false)
  assert.equal(receipt.candidateSha, null)
  assert.equal(receipt.gates.independentApproval, 'PENDING')
  assert.equal(receipt.gates.deployment, 'NOT_DEPLOYED')
  assert.equal(receipt.gates.productionReverification, 'NOT_RUN')
})

test('strict receipt validation preserves exact candidate SHA and all terminal gate semantics', () => {
  assert.match(validator, /receipt\.candidateSha !== context\.expectedSha/)
  assert.match(validator, /certified=true/)
  assert.match(validator, /independentApproval: 'APPROVED'/)
  assert.match(validator, /deployment: 'DEPLOYED_EXACT_SHA'/)
  assert.match(validator, /productionReverification: 'ACCEPTED'/)
  assert.doesNotMatch(validator, /LIFE_MODEL_RELEASE_CERTIFIED/)
})

test('workflow never turns ordinary PR validation into a launch certification claim', () => {
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /inputs\.certify == true/)
  assert.match(workflow, /validate-life-model-release-receipt\.mjs --strict/)
  assert.match(workflow, /life-model-release-evidence\.test\.mjs/)
  assert.match(workflow, /COMPONENT_ENVELOPE_SHA256:/)
})
