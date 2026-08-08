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
  assert.equal((lifeMapEventsSource.match(/if \(!firebasePublicEnvReady\)/g) ?? []).length, 1)
  assert.match(lifeMapEventsSource, /if \(!resolvedUserId \|\| !firebasePublicEnvReady\) \{[\s\S]*setEras\(\[\]\)/)
  assert.match(lifeMapEventsSource, /const positionedDemoNodes = canonicalLifeMapDemoNodes\.map/)
  assert.match(lifeMapEventsSource, /if \(explicitDemo\) \{[\s\S]*setNodes\(positionedDemoNodes\)/)
  assert.match(lifeMapEventsSource, /if \(explicitDemo\) \{[\s\S]*setEras\(lifeMapEras\)/)
  assert.match(lifeMapEventsSource, /if \(!firebasePublicEnvReady\) \{[\s\S]*setNodes\(\[\]\)/)
  assert.match(lifeMapEventsSource, /sourceMode: LifeMapSourceMode = explicitDemo[\s\S]*\? "explicit-demo"[\s\S]*: !firebasePublicEnvReady[\s\S]*\? "unavailable"/)
})

test('external requests are intercepted and aborted before send', () => {
  assert.match(diagnosticSource, /await context\.route\('\*\*\/\*'/)
  assert.match(diagnosticSource, /parsed\.origin === baseOrigin/)
  assert.match(diagnosticSource, /kind: 'blocked-external-request'/)
  assert.match(diagnosticSource, /await route\.abort\('blockedbyclient'\)/)
  assert.match(diagnosticSource, /externalRequestsBlockedBeforeSend: true/)
})

test('only bounded local navigation, HMR, promoted asset and canonical manifest cancellations are ignored', () => {
  assert.match(diagnosticSource, /parsed\.searchParams\.has\('_rsc'\)/)
  assert.match(diagnosticSource, /parsed\.pathname\.startsWith\('\/_next\/static\/webpack\/'\)/)
  assert.match(diagnosticSource, /parsed\.pathname\.endsWith\('\.hot-update\.js'\)/)
  assert.match(diagnosticSource, /parsed\.pathname\.endsWith\('\.hot-update\.json'\)/)
  assert.match(diagnosticSource, /entry\.method === 'GET'/)
  assert.match(diagnosticSource, /entry\.resourceType === 'fetch'/)
  assert.match(diagnosticSource, /promotedGeneratedAssetPaths\.has\(parsed\.pathname\)/)
  for (const path of [
    'home-entry-chamber-v1\\.glb',
    'portal-ring-master-v1\\.glb',
    'urai-orb-avatar-v1\\.glb',
  ]) assert.match(diagnosticSource, new RegExp(path))
  assert.match(diagnosticSource, /promoted-generated-asset-navigation-cancellation/)
  assert.match(diagnosticSource, /parsed\.pathname\.startsWith\('\/assets\/urai\/final\/manifests\/'\)/)
  assert.match(diagnosticSource, /parsed\.pathname\.endsWith\('-asset-factory-spatial-handoff\.json'\)/)
  assert.match(diagnosticSource, /canonical-local-manifest-navigation-cancellation/)
  assert.match(diagnosticSource, /actionableFailedRequests/)
})

test('canonical compatibility redirects settle before route teardown', () => {
  assert.match(diagnosticSource, /const canonicalRedirectTargets = new Map/)
  assert.match(diagnosticSource, /\['\/ascent', '\/home\?from=ascent'\]/)
  assert.match(diagnosticSource, /await page\.waitForURL\(`\$\{baseUrl\}\$\{canonicalTarget\}`/)
  assert.match(diagnosticSource, /Spatial diagnostic canonical redirect failed/)
  assert.match(diagnosticSource, /canonicalRedirectTargets: Object\.fromEntries\(canonicalRedirectTargets\)/)
})

test('actionable findings fail and remain in a schema-bound artifact', () => {
  assert.match(diagnosticSource, /urai-spatial-missing-resource-diagnostics-6/)
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
