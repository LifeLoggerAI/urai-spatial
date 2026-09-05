import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const workflow = readFileSync(
  path.join(repositoryRoot, '.github/workflows/capture-legacy-hosting-recovery.yml'),
  'utf8',
).replace(/\r\n?/g, '\n')

test('legacy Hosting recovery workflow is manual, exact-head, read-only, and quarantined', () => {
  assert.match(workflow, /^name: Legacy Firebase Hosting Recovery Verification$/m)
  assert.match(workflow, /^  workflow_dispatch:$/m)
  assert.doesNotMatch(workflow, /^  (?:push|pull_request|schedule):$/m)
  assert.match(workflow, /expected_sha:/)
  assert.match(workflow, /required: true/)
  assert.match(workflow, /EXPECTED_SHA: \$\{\{ inputs\.expected_sha \}\}/)
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_sha \}\}/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /\[\[ "\$EXPECTED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/)
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/)
  assert.match(workflow, /node scripts\/firebase-hosting-recovery\.mjs --self-test/)
  assert.match(workflow, /node scripts\/audit-production-workflow-authority\.mjs/)
  assert.doesNotMatch(workflow, /node scripts\/firebase-hosting-recovery\.mjs (?:discover|restore)/)
  assert.doesNotMatch(workflow, /firebase(?:-tools)?(?:@[^\s]+)?\s+(?:deploy|hosting:clone)/)
  assert.doesNotMatch(workflow, /live-release\.mjs --deploy/)
})

test('legacy Hosting recovery verification exposes no production credential or mutation authority', () => {
  for (const forbidden of [
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'FIREBASE_TOKEN',
    'environment: production',
    'id-token: write',
    'contents: write',
    'actions: write',
    'CAPTURE_LEGACY_HOSTING_VERSION',
  ]) {
    assert.equal(workflow.includes(forbidden), false, `Quarantined recovery workflow must not include ${forbidden}`)
  }
  assert.match(workflow, /^permissions:\n  contents: read$/m)
  assert.match(workflow, /Verify legacy recovery remains quarantined/)
  assert.match(workflow, /productionCredentialsAvailable: false/)
  assert.match(workflow, /recoveryMutationAttempted: false/)
  assert.match(workflow, /providerRecoveryVerified: false/)
})

test('quarantine receipt remains outside source and uses truthful GitHub retention without claiming recovery proof', () => {
  assert.match(workflow, /schemaVersion: 'urai-legacy-hosting-recovery-quarantine-1'/)
  assert.match(workflow, /classification: 'NO-GO'/)
  assert.match(workflow, /checksOnly: true/)
  assert.match(workflow, /exactHeadSha: process\.env\.EXPECTED_SHA/)
  assert.match(workflow, /path: artifacts\/legacy-hosting-recovery\/quarantine\.json/)
  assert.match(workflow, /retention-days: 90/)
  assert.match(workflow, /Longer-lived evidence requires a separately verified durable archive/)
  assert.doesNotMatch(workflow, /retention-days: 365/)
  assert.match(workflow, /test -z "\$\(git status --porcelain --untracked-files=all\)"/)
  assert.doesNotMatch(workflow, /legacy-live-release\.json|URAI_HOSTING_RECOVERY_RECEIPT/)
})
