import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('Privacy Controls has one canonical route owner', () => {
  const page = read('src/app/privacy-controls/page.tsx')
  const legacy = read('src/app/UraiAutonomousV1Layer.tsx')
  assert.match(page, /ConsentSanctuaryClient/)
  assert.match(page, /<ConsentSanctuaryClient\s*\/>/)
  assert.doesNotMatch(legacy, /pathname\.startsWith\("\/privacy-controls"\)/)
  assert.match(legacy, /Privacy Controls[\s\S]*route-owned[\s\S]*excluded from this layer/)
})

test('Consent Sanctuary is spatial and remains directly operable', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const css = read('src/app/privacy-controls/consent-sanctuary.css')
  assert.match(client, /<Canvas/)
  assert.match(client, /OrbitControls/)
  assert.match(client, /DOMAIN_ORDER\.map/)
  assert.match(client, /Skip to direct controls/)
  assert.match(client, /role="dialog"/)
  assert.match(client, /aria-live="polite"/)
  assert.match(client, /DEMONSTRATION — no personal data/)
  assert.match(client, /No private state was replaced with demo data/)
  assert.match(client, /event\.key === 'Home'/)
  assert.match(client, /event\.key !== 'Escape'/)
  assert.match(css, /min-height:48px/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /forced-colors/)
})

test('Consent mutations use authenticated trusted orchestration and durable enforcement state', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const bridge = read('src/lib/privacy/operationalPrivacyClient.ts')
  const functions = read('../apps/functions/src/privacyOperations.ts')
  const model = read('src/app/privacy-controls/consentModel.ts')
  assert.match(client, /onAuthStateChanged/)
  assert.match(client, /applyOperationalConsentPolicy/)
  assert.doesNotMatch(client, /runTransaction|result: 'enforced'/)
  assert.match(bridge, /httpsCallable/)
  assert.match(functions, /applyConsentPolicy/)
  assert.match(functions, /CONSENT_REVISION_CONFLICT/)
  assert.match(functions, /privacyEnforcementJobs/)
  assert.match(functions, /processPrivacyEnforcementJob/)
  assert.match(functions, /partially-enforced/)
  assert.match(functions, /providerRevocationQueue/)
  assert.match(model, /EnforcementState/)
  assert.match(model, /consequenceSummary/)
})

test('Export and deletion are trusted idempotent owner-scoped lifecycles', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const functions = read('../apps/functions/src/privacyOperations.ts')
  assert.match(client, /createOperationalExportRequest/)
  assert.match(client, /getOperationalExportDownloadUrl/)
  assert.match(client, /createOperationalDeletionRequest/)
  assert.match(functions, /requireRecentAuthentication/)
  assert.match(functions, /stableId\(uid, operationId, 'export'\)/)
  assert.match(functions, /private-exports\/\$\{uid\}\/\$\{snapshot\.id\}/)
  assert.match(functions, /checksumAlgorithm: 'sha256'/)
  assert.match(functions, /processDeletionQueueItem/)
  assert.match(functions, /recursiveDelete/)
  assert.match(functions, /retainedExceptions/)
  assert.match(functions, /ownerDigest/)
})

test('Client subscriptions remain inside the authenticated owner path', () => {
  const bridge = read('src/lib/privacy/operationalPrivacyClient.ts')
  assert.match(bridge, /collection\(getFirebaseDb\(\), 'users', uid, collectionName\)/)
  assert.doesNotMatch(bridge, /where\('uid'/)
  assert.doesNotMatch(bridge, /collection\(getFirebaseDb\(\), collectionName\)/)
})
