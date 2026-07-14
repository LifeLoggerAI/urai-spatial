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

test('capture workflow is manual, exact-main, protected, and read-only', () => {
  assert.match(workflow, /^name: Capture legacy Firebase Hosting recovery$/m)
  assert.match(workflow, /^  workflow_dispatch:$/m)
  assert.doesNotMatch(workflow, /^  (?:push|pull_request|schedule):$/m)
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/)
  assert.match(workflow, /inputs\.confirm == 'CAPTURE_LEGACY_HOSTING_VERSION'/)
  assert.match(workflow, /^    environment: production$/m)
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/)
  assert.match(workflow, /git ls-remote --exit-code origin refs\/heads\/main/)
  assert.match(workflow, /node scripts\/firebase-hosting-recovery\.mjs discover/)
  assert.doesNotMatch(workflow, /node scripts\/firebase-hosting-recovery\.mjs restore/)
  assert.doesNotMatch(workflow, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy/)
  assert.doesNotMatch(workflow, /live-release\.mjs --deploy/)
})

test('capture workflow scopes the production credential to one discovery step', () => {
  const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
  assert.equal(workflow.split(secretMarker).length - 1, 1)
  const discoveryStart = workflow.indexOf('- name: Discover exact current live Hosting version')
  assert.notEqual(discoveryStart, -1, 'Discovery step not found')
  const nextStepIndex = workflow.indexOf('\n      - name:', discoveryStart + 1)
  const nextStep = nextStepIndex === -1 ? workflow.length : nextStepIndex
  const discoveryStep = workflow.slice(discoveryStart, nextStep)
  assert.match(discoveryStep, /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.match(discoveryStep, /firebase-hosting-recovery\.mjs discover/)
  assert.doesNotMatch(workflow.slice(0, discoveryStart), /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.doesNotMatch(workflow.slice(nextStep), /FIREBASE_SERVICE_ACCOUNT_JSON/)
})

test('capture receipt remains outside source and is retained', () => {
  assert.match(workflow, /URAI_HOSTING_RECOVERY_RECEIPT: \$\{\{ runner\.temp \}\}\/hosting-recovery\/legacy-live-release\.json/)
  assert.match(workflow, /path: \$\{\{ runner\.temp \}\}\/hosting-recovery\//)
  assert.match(workflow, /retention-days: 365/)
  assert.match(workflow, /test -z "\$\(git status --porcelain --untracked-files=all\)"/)
  assert.match(workflow, /^permissions:\n  contents: read$/m)
  assert.doesNotMatch(workflow, /contents: write|actions: write|id-token: write/)
})
