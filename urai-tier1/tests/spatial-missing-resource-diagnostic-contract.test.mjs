import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const repositoryRoot = path.resolve(process.cwd(), '..')
const diagnosticSource = fs.readFileSync(
  path.join(repositoryRoot, 'tests', 'spatial-missing-resource-diagnostic.mjs'),
  'utf8',
)
const workflowSource = fs.readFileSync(
  path.join(repositoryRoot, '.github', 'workflows', 'spatial-missing-resource-diagnostics.yml'),
  'utf8',
)
const lifeMapEventsSource = fs.readFileSync(
  path.join(process.cwd(), 'src', 'components', 'lifemap', 'useLifeMapEvents.ts'),
  'utf8',
)

test('fallback diagnostic neutralizes provider configuration before starting Next', () => {
  for (const variable of [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'FIREBASE_CONFIG',
  ]) assert.match(diagnosticSource, new RegExp(variable))
  assert.match(diagnosticSource, /NEXT_PUBLIC_URAI_MANIFEST_FIRESTORE: 'false'/)
  assert.match(diagnosticSource, /providerMode: 'disabled-for-fallback-diagnostic'/)
})

test('Life Map event listeners remain offline when public Firebase configuration is absent', () => {
  assert.match(lifeMapEventsSource, /firebasePublicEnvReady/)
  assert.equal((lifeMapEventsSource.match(/if \(!firebasePublicEnvReady\)/g) ?? []).length, 2)
  assert.match(lifeMapEventsSource, /setNodes\(lifeMapNodes\)/)
  assert.match(lifeMapEventsSource, /setEras\(lifeMapEras\)/)
})

test('external requests are intercepted and aborted before send', () => {
  assert.match(diagnosticSource, /await context\.route\('\*\*\/\*'/)
  assert.match(diagnosticSource, /parsed\.origin === baseOrigin/)
  assert.match(diagnosticSource, /kind: 'blocked-external-request'/)
  assert.match(diagnosticSource, /await route\.abort\('blockedbyclient'\)/)
  assert.match(diagnosticSource, /externalRequestsBlockedBeforeSend: true/)
})

test('only bounded local navigation, HMR and metadata-icon aborts are ignored', () => {
  assert.match(diagnosticSource, /parsed\.searchParams\.has\('_rsc'\)/)
  assert.match(diagnosticSource, /parsed\.pathname\.startsWith\('\/_next\/static\/webpack\/'\)/)
  assert.match(diagnosticSource, /parsed\.pathname\.endsWith\('\.hot-update\.js'\)/)
  assert.match(diagnosticSource, /parsed\.pathname\.endsWith\('\.hot-update\.json'\)/)
  assert.match(diagnosticSource, /benignStaticMetadataPaths/)
  assert.match(diagnosticSource, /'\/icon\.svg'/)
  assert.match(diagnosticSource, /entry\.resourceType === 'other' \|\| entry\.resourceType === 'image'/)
  assert.match(diagnosticSource, /same-origin-static-metadata-icon/)
  assert.match(diagnosticSource, /actionableFailedRequests/)
})

test('actionable findings fail and remain in a schema-bound artifact', () => {
  assert.match(diagnosticSource, /urai-spatial-missing-resource-diagnostics-4/)
  assert.match(diagnosticSource, /missing-resources\.json/)
  assert.match(diagnosticSource, /if \(actionable\.length\)/)
  assert.match(diagnosticSource, /process\.exitCode = 1/)
})

test('workflow is exact-head, immutable-action and artifact bound', () => {
  assert.match(workflowSource, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/)
  assert.match(workflowSource, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/)
  assert.match(workflowSource, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/)
  assert.match(workflowSource, /fetch-depth: 1/)
  assert.match(workflowSource, /persist-credentials: false/)
  assert.match(workflowSource, /corepack prepare pnpm@10\.0\.0 --activate/)
  assert.match(workflowSource, /Fail closed on actionable resource findings/)
  assert.match(workflowSource, /retention-days: 30/)
})
