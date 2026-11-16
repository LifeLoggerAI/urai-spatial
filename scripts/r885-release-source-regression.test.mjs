import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = readFileSync('.github/workflows/spatial-governed-wif-deploy.yml', 'utf8')
const smoke = readFileSync('scripts/urai-post-deploy-smoke.mjs', 'utf8')
function section(name) {
  const start = workflow.indexOf('      - name: ' + name)
  assert.ok(start >= 0, 'Missing workflow step: ' + name)
  const next = workflow.indexOf('\n      - ', start + 8)
  return workflow.slice(start, next < 0 ? undefined : next)
}

test('R879: API 5xx responses cannot pass the negative route boundary smoke', () => {
  assert.match(smoke, /response\.status\s*<\s*500/)
  assert.doesNotMatch(smoke, /response\.status\s*<\s*600/)
})

test('R881: separate original PR review, merged commit and current main proof', () => {
  const authority = section('Validate exact governed release authority')
  assert.match(authority, /PR_HEAD_SHA/)
  assert.match(authority, /merge_commit_sha/)
  assert.match(authority, /git\/ref\/heads\/main/)
  assert.match(authority, /head_sha=\$PR_HEAD_SHA/)
  assert.match(authority, /head_sha=\$RELEASE_SHA/)
  assert.match(authority, /urai-spatial-ci\.yml/)
  assert.match(section('Re-prove exact deployment boundary'), /git\/ref\/heads\/main/)
})

test('R880: missing or uncertified rollback fingerprint must block publication', () => {
  const capture = section('Capture current live Hosting rollback authority')
  assert.match(capture, /verified-post-deploy-smoke/)
  assert.match(capture, /fingerprint_status" = valid/)
  assert.doesNotMatch(capture, /--location/)
})

test('R882: verified custom domain owner and live channel replace preview-mixed history', () => {
  const selection = section('Authenticate and resolve actual Hosting site and live-channel source')
  assert.match(selection, /R882_PROVIDER_LIVE_SITE_COLLECTOR\.py/)
  assert.match(selection, /VERIFIED_HOSTING_SITE_ID/)
  assert.match(section('Re-prove exact deployment boundary'), /site-readback-final\.json/)
  assert.doesNotMatch(workflow, /sites\/\$FIREBASE_PROJECT\/releases\?pageSize/)
  const rollback = section('Roll back Hosting and Functions after any deployment or certification failure')
  assert.match(rollback, /R882_PROVIDER_LIVE_SITE_COLLECTOR\.py/)
  assert.match(rollback, /live-release-after-restore\.json/)
  assert.match(rollback, /latestLiveRelease\.versionName/)
  assert.doesNotMatch(rollback, /releases\?pageSize=100/)
})

test('R883: attestation is checked before deploying Functions or Hosting bytes', () => {
  assert.match(workflow, /R883_VERIFY_FUNCTIONS_BUILD\.mjs/)
  assert.match(workflow, /--mode attest/)
  assert.match(workflow, /--mode verify/)
  assert.match(workflow, /R883_VERIFY_HOSTING_ARTIFACTS\.mjs/)
  assert.match(workflow, /--phase pending/)
  assert.match(workflow, /--phase certified/)
  assert.match(workflow, /steps\.hosting-byte-custody\.outcome == 'success'/)
  assert.match(workflow, /steps\.certified-byte-custody\.outcome == 'success'/)
})

test('R885: protected backend rollback ambiguity preserves mandatory production HOLD', () => {
  const boundary = section('Re-prove exact deployment boundary')
  assert.match(boundary, /backend revision and rollback equivalence not certified/)
  assert.match(boundary, /exit 1/)
})

test('R887: deployed Functions must use governed config with final post-predeploy guard', () => {
  const prepare = section('Prepare source-preserving guarded Firebase Functions configuration')
  const deploy = workflow.slice(workflow.indexOf('      - id: deploy-functions'), workflow.indexOf('      - id: hosting-byte-custody'))
  assert.ok(deploy.startsWith('      - id: deploy-functions'))
  assert.match(prepare, /r887-guard-functions-predeploy\.mjs --mode prepare/)
  assert.match(deploy, /--config firebase\.r887\.governed\.json/)
  assert.doesNotMatch(deploy, /--config firebase\.json/)
  const boundary = section('Re-prove exact deployment boundary')
  assert.match(boundary, /HOLD: protected backend revision and rollback equivalence not certified/)
  assert.match(boundary, /exit 1/)
})
