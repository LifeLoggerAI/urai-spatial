import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const moviePage = read('src/app/life-movie/page.tsx')
const movieClient = read('src/app/life-movie/LifeMovieClient.tsx')
const home = read('src/app/HomeSpatialWorldFinal.tsx')
const replay = read('src/app/replay/ReplayProductControls.tsx')
const council = read('src/spatial/council/CouncilRealm.tsx')
const councilPanel = read('src/spatial/council/CouncilConversationPanel.tsx')
const councilAgents = read('src/spatial/council/councilAgentSchema.ts')
const deployProof = read('src/app/api/system/deploy-proof/route.ts')
const routeManifest = JSON.parse(fs.readFileSync(new URL('../../release/route-manifest.json', import.meta.url), 'utf8'))
const passiveRuntime = read('src/spatial/signals/PassiveSignalRuntime.tsx')
const passiveServer = fs.readFileSync(new URL('../../apps/functions/src/passiveSignals.ts', import.meta.url), 'utf8')
const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const firestoreRules = fs.readFileSync(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8')
const layout = read('src/app/layout.tsx')
const privacyOperations = fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts', import.meta.url), 'utf8')

test('Life Movie is an authenticated owner-memory runtime, not a legacy demo shell', () => {
  assert.match(moviePage, /LifeMovieClient/)
  assert.match(movieClient, /onAuthStateChanged\(getAuth\(app\)/)
  assert.match(movieClient, /collection\(getFirebaseDb\(\), 'users', user\.uid, 'memories'\)/)
  assert.match(movieClient, /parseSelectedMemory\(item\.data\(\), user\.uid, item\.id\)/)
  assert.match(movieClient, /data-source="authenticated-owner-memories"/)
  assert.match(movieClient, /data-provider-render="not-required"/)
  assert.doesNotMatch(movieClient, /demoLifeMovie|demoLifeMovieRenderJob|mock-v1|video-stub/)
})

test('Life Movie and XR are reachable from normal product navigation', () => {
  assert.match(home, /href: "\/life-movie"/)
  assert.match(home, /href: "\/xr"/)
  assert.match(home, /<Link href="\/life-movie">Life Movie<\/Link>/)
  assert.match(home, /<Link href="\/xr">XR<\/Link>/)
  assert.match(replay, /href=\{\`\/life-movie\?memoryId=\$\{encodeURIComponent\(memory\.id\)\}\`\}/)
})

test('Council uses promoted agents plus explicit-consent live provider conversation', () => {
  assert.match(councilAgents, /export const COUNCIL_AGENTS/)
  assert.match(council, /COUNCIL_AGENTS/)
  assert.match(council, /CouncilConversationPanel/)
  assert.match(councilPanel, /requestOpenAIOrb/)
  assert.match(councilPanel, /Allow OpenAI processing for this Council message/)
  assert.match(councilPanel, /aiProcessingConsent: true/)
  assert.match(councilPanel, /attemptedExternalOrbFallback/)
  assert.match(councilPanel, /uncertainExternalOrbFallback/)
  assert.match(councilPanel, /deterministicOrbFallback/)
})

test('release authority declares the newly exposed launch surfaces', () => {
  for (const route of ['/life-movie', '/council', '/xr', '/login']) {
    assert.ok(routeManifest.classification.publicExact.includes(route), `${route} must be public route authority`)
    assert.match(deployProof, new RegExp(`['"]${route.replace('/', '\\/')}['"]`))
  }
  assert.ok(routeManifest.criticalRoutes.includes('/life-movie'))
  assert.match(deployProof, /authenticated-private-firestore-or-explicit-demo-only/)
  assert.match(deployProof, /authenticated-owner-memories/)
  assert.match(deployProof, /authenticated-consented-openai-with-disclosed-local-fallback/)
})


test('passive signal runtime is consent-bound, server-owned, and does not silently activate camera or microphone', () => {
  assert.match(layout, /PassiveSignalRuntime/)
  assert.match(passiveRuntime, /privacyRuntime', 'workforce-actions'/)
  assert.match(passiveRuntime, /automationEnabled/)
  assert.match(passiveRuntime, /permission\.state !== 'granted'/)
  assert.match(passiveRuntime, /record\('stillness'/)
  assert.match(passiveRuntime, /record\('quick-cancel'/)
  assert.match(passiveRuntime, /record\('motion'/)
  assert.doesNotMatch(passiveRuntime, /getUserMedia|mediaDevices|requestPermission\(/)

  assert.match(passiveServer, /PASSIVE_SIGNAL_AUTOMATION_CONSENT_REQUIRED/)
  assert.match(passiveServer, /PASSIVE_SIGNAL_LOCATION_CONSENT_REQUIRED/)
  assert.match(passiveServer, /PASSIVE_SIGNAL_MODEL_CONTEXT_CONSENT_REQUIRED/)
  assert.match(passiveServer, /PASSIVE_SIGNAL_LIKENESS_CONSENT_REQUIRED/)
  assert.match(passiveServer, /rawAudioStored: false/)
  assert.match(passiveServer, /rawImageStored: false/)
  assert.match(functionsIndex, /recordPassiveSignal/)

  for (const collectionName of ['behaviorSignals', 'voiceEvents', 'locations']) {
    assert.match(firestoreRules, new RegExp(`match /${collectionName}/\\{`))
  }
  assert.match(firestoreRules, /match \/behaviorSignals\/\{signalId\}[\s\S]*allow write: if false;/)
  for (const collectionName of ['behaviorSignals', 'voiceEvents', 'locations']) {
    assert.match(privacyOperations, new RegExp(`collection\\('${collectionName}'\\)`))
    assert.match(privacyOperations, new RegExp(`'${collectionName}'`))
  }
})
