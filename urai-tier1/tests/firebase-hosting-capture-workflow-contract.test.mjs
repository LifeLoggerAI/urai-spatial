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

test('capture workflow is manual, exact-main, protected, and non-mutating', () => {
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

test('capture workflow authenticates only through protected GitHub OIDC/WIF', () => {
  assert.match(workflow, /permissions:\n\s+contents: read\n\s+id-token: write/)
  assert.match(workflow, /google-github-actions\/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093/)
  assert.match(workflow, /google-github-actions\/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db/)
  assert.match(workflow, /workload_identity_provider: \$\{\{ vars\.GCP_WIF_PROVIDER \}\}/)
  assert.match(workflow, /service_account: \$\{\{ secrets\.GCP_DEPLOY_SERVICE_ACCOUNT \}\}/)
  assert.match(workflow, /create_credentials_file: true/)
  assert.match(workflow, /export_environment_variables: true/)
  assert.match(workflow, /gcloud auth list/)
  assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.doesNotMatch(workflow, /credentials_json:/)
})

test('capture receipt remains outside source and is retained', () => {
  assert.match(workflow, /URAI_HOSTING_RECOVERY_RECEIPT: \$\{\{ runner\.temp \}\}\/hosting-recovery\/legacy-live-release\.json/)
  assert.match(workflow, /path: \$\{\{ runner\.temp \}\}\/hosting-recovery\//)
  assert.match(workflow, /retention-days: 365/)
  assert.match(workflow, /test -z "\$\(git status --porcelain --untracked-files=all\)"/)
})
