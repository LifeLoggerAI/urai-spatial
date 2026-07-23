import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const authority = read('../docs/home/HOME_FINALIZATION_AUTHORITY_2026-07-23.md')
const personalization = read('src/app/home/homePersonalizationModel.ts')
const personalizationHook = read('src/app/home/useHomePersonalizedScene.ts')
const orb = read('src/app/home/orbStateController.ts')
const candidateState = read('src/app/home/homeReviewCandidateState.ts')
const assetOwner = read('src/app/AssetDrivenHomeWorld.tsx')
const manifest = read('src/spatial/assets/assetManifest.ts')
const runtime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const fallback = read('src/app/FinalHomeWorld.tsx')
const doorwayProof = read('../tests/native-doorway-proof.mjs')

test('Home remains visually NO-GO until exact deployed founder acceptance', () => {
  assert.match(authority, /HOME VISUAL STATUS: NO-GO/)
  assert.match(authority, /Adam Clamp explicitly approves the exact deployed desktop and mobile SHA/)
  assert.match(authority, /No approval for another SHA transfers/)
})

test('the personalization contract separates private, empty, offline and disclosed sample modes', () => {
  for (const mode of ['private-personalized', 'world-forming', 'permission-limited', 'unavailable', 'offline', 'explicit-sample']) {
    assert.match(personalization, new RegExp(`['"]${mode}['"]`))
  }
  assert.match(personalization, /disclosedSample: true/)
  assert.match(personalization, /privateDataMounted: false/)
  assert.match(personalization, /No personal information is mounted here/)
  assert.match(personalization, /will not invent memories/)
  assert.match(personalization, /inspect, correct, hide, or delete/)
})

test('review fixtures isolate private records and include a disclosed synthetic personalized state', () => {
  assert.match(personalizationHook, /homePrivateFixture/)
  assert.match(personalizationHook, /safePrivate: true/)
  assert.match(personalizationHook, /if \(isolatedReviewMode\)/)
  assert.match(personalizationHook, /setSignedIn\(false\)/)
  assert.match(personalizationHook, /setEvidence\(\[\]\)/)
  assert.match(personalization, /safePrivateFixtureEvidence/)
  assert.match(personalization, /synthetic review inputs, not user records/)
  assert.match(personalization, /privateDataMounted: false/)
  assert.match(personalization, /reviewFixture: 'safe-private'/)
})

test('normal production personalization cannot silently consume disclosed sample places', () => {
  assert.match(personalization, /if \(input\.requestedMode === 'explicit-sample'\)/)
  assert.match(personalizationHook, /params\.get\('homeSample'\) === '1'/)
  assert.match(personalizationHook, /users', user\.uid, 'memories'/)
  assert.match(personalizationHook, /setDataAvailable\(false\)/)
  assert.match(personalization, /No substitute memories or sample records were mounted/)
})

test('every required Orb state has sensory output bindings and a visible runtime owner', () => {
  for (const state of ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']) {
    assert.match(orb, new RegExp(`\\b${state}: \\{`))
    assert.match(assetOwner, new RegExp(`['"]${state}['"]`))
  }
  for (const binding of ['animation', 'material', 'light', 'particles', 'movement', 'audioCue', 'caption', 'haptic', 'announcement', 'affordance']) {
    assert.match(orb, new RegExp(`readonly ${binding}`))
  }
  assert.match(assetOwner, /resolveOrbSensoryOutput/)
  assert.match(assetOwner, /data-home-orb-state=/)
  assert.match(assetOwner, /data-home-audio=/)
  assert.match(assetOwner, /Enable ambience/)
  assert.match(assetOwner, /aria-live="polite"/)
})

test('review candidates remain disclosed and cannot silently become promoted assets', () => {
  for (const id of ['home-entry-chamber-model-v1', 'portal-ring-master-glb-v1', 'urai-orb-avatar-glb-v1']) {
    const start = manifest.indexOf(`id: '${id}'`)
    assert.notEqual(start, -1)
    const entry = manifest.slice(start, start + 700)
    assert.match(entry, /status: 'future'/)
    assert.match(entry, /fallbackAssetId:/)
    assert.match(candidateState, new RegExp(`assetId: '${id}'`))
  }
  assert.match(candidateState, /allowDisclosedReviewCandidate/)
  assert.match(assetOwner, /homeAssetReview/)
  assert.match(assetOwner, /Review candidate composition — visually improved, still unapproved/)
})

test('asset-driven Home owns supported review runtime and procedural world is degraded fallback only', () => {
  assert.match(runtime, /AssetDrivenHomeWorld/)
  assert.match(runtime, /asset-driven-primary-with-procedural-degraded-fallback/)
  assert.match(runtime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.match(assetOwner, /AssetRuntimeBoundary/)
  assert.match(assetOwner, /fallback=\{fallback\}/)
  assert.match(assetOwner, /home-authored-embodied-self/)
  assert.doesNotMatch(assetOwner, /capsuleGeometry/)
  assert.doesNotMatch(assetOwner, /const MEMORY_SCENES =/)
  assert.match(fallback, /capsuleGeometry/)
  assert.match(fallback, /const MEMORY_SCENES =/)
  assert.match(authority, /reclassified as a fallback implementation/)
})

test('the review world has authored terrain memory forms and distinct portal compositions', () => {
  assert.match(assetOwner, /home-authored-terrain/)
  assert.match(assetOwner, /SanctuaryTerrain/)
  assert.match(assetOwner, /MemoryPlace/)
  assert.match(assetOwner, /relationship-presence/)
  assert.match(assetOwner, /torusKnotGeometry/)
  assert.match(assetOwner, /destination="ground"/)
  assert.match(assetOwner, /destination="life-map"/)
  assert.match(assetOwner, /The path descends into Ground/)
  assert.match(assetOwner, /The path rises into Life Map/)
})

test('persistent visible shortcut pills are removed and semantic direct access remains', () => {
  assert.doesNotMatch(runtime, /urai-home-runtime-doorways/)
  assert.doesNotMatch(assetOwner, /className="urai-final-home-doorways"/)
  assert.match(assetOwner, /home-semantic-navigation sr-only/)
  assert.match(assetOwner, /data-testid="home-semantic-ground"/)
  assert.match(assetOwner, /data-testid="home-semantic-life-map"/)
  assert.match(doorwayProof, /persistentVisibleShortcutPillsForbidden: true/)
  assert.match(doorwayProof, /semanticNavigationNonDominant/)
})

test('personalized state changes actual world composition and exposes provenance', () => {
  assert.match(assetOwner, /PersonalizedPlaces/)
  assert.match(assetOwner, /scene\.environment\.weatherTone/)
  assert.match(assetOwner, /home-personalized-places-/)
  assert.match(assetOwner, /data-home-review-fixture=/)
  assert.match(assetOwner, /Why am I seeing this\?/)
  assert.match(assetOwner, /Review consent/)
  assert.match(assetOwner, /Correct, hide, or delete sources/)
})
