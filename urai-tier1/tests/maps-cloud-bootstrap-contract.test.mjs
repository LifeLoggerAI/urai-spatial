import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflowPath = '../.github/workflows/urai-maps-cloud-bootstrap.yml'
const policyPath = '../operations/maps/geographic-maps-launch-policy.json'

const workflow = fs.readFileSync(workflowPath, 'utf8')
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'))

test('targets only the canonical project and two governed Maps APIs', () => {
  assert.match(workflow, /EXPECTED_PROJECT_ID: urai-4dc1d/)
  assert.match(workflow, /maps-backend\.googleapis\.com geocoding-backend\.googleapis\.com/)
  assert.doesNotMatch(workflow, /places-backend\.googleapis\.com/)
  assert.doesNotMatch(workflow, /routes\.googleapis\.com/)
  assert.deepEqual(policy.apiAllowlist, ['maps-javascript-api', 'geocoding-api'])
})

test('requires explicit main-only confirmation before mutation', () => {
  assert.match(workflow, /test "\$GITHUB_REF" = 'refs\/heads\/main'/)
  assert.match(workflow, /enable:ENABLE_URAI_MAPS_APIS/)
  assert.match(workflow, /audit:AUDIT_URAI_MAPS/)
  assert.match(workflow, /if: inputs\.operation == 'enable'/)
})

test('pull-request cloud audit uses a dedicated read-only WIF identity', () => {
  assert.match(workflow, /GCP_MAPS_AUDIT_SERVICE_ACCOUNT/)
  assert.match(workflow, /credentialClass: 'dedicated-read-only-wif'/)
  assert.match(workflow, /id-token: write/)
  assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.doesNotMatch(workflow, /Audit existing Firebase credential bridge/)
})

test('manual mutation is WIF-only, separately confirmed, and creates no API key', () => {
  assert.match(workflow, /GCP_MAPS_ADMIN_SERVICE_ACCOUNT/)
  assert.match(workflow, /GCP_WIF_PROVIDER/)
  assert.match(workflow, /credentialClass: 'dedicated-admin-wif'/)
  assert.doesNotMatch(workflow, /GCP_MAPS_ADMIN_CREDENTIALS_JSON/)
  assert.doesNotMatch(workflow, /credentials_json/)
  assert.doesNotMatch(workflow, /gcloud alpha services api-keys create/)
  assert.doesNotMatch(workflow, /gcloud services api-keys create/)
  assert.match(workflow, /apiKeyCreated: false/)
})

test('retains receipts without deploying production', () => {
  assert.match(workflow, /maps-cloud-audit\.json/)
  assert.match(workflow, /enabled-before-governed\.txt/)
  assert.match(workflow, /enabled-after-governed\.txt/)
  assert.match(workflow, /maps-cloud-bootstrap-receipt\.json/)
  assert.match(workflow, /productionDeploymentPerformed: false/)
  assert.doesNotMatch(workflow, /firebase deploy/)
})
