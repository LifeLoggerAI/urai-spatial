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
