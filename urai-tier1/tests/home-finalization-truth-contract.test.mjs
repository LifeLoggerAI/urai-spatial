import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const authority = read('../docs/home/HOME_FINALIZATION_AUTHORITY_2026-07-23.md')
const personalization = read('src/app/home/homePersonalizationModel.ts')
const orb = read('src/app/home/orbStateController.ts')
const manifest = read('src/spatial/assets/assetManifest.ts')
const runtime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const procedural = read('src/app/FinalHomeWorld.tsx')

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

test('normal production personalization cannot silently consume disclosed sample places', () => {
  assert.match(personalization, /if \(input\.requestedMode === 'explicit-sample'\)/)
  assert.match(personalization, /sample: false/)
  assert.doesNotMatch(personalization, /place-loved|ride-home|voices-dinner|song-returned|quiet-growth/)
})

test('every required Orb state has sensory output bindings', () => {
  for (const state of ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']) {
    assert.match(orb, new RegExp(`\\b${state}: \\{`))
  }
  for (const binding of ['animation', 'material', 'light', 'particles', 'movement', 'audioCue', 'caption', 'haptic', 'announcement', 'affordance']) {
    assert.match(orb, new RegExp(`readonly ${binding}`))
  }
  assert.match(orb, /reducedMotion \? 'orb-state-static'/)
  assert.match(orb, /muted \? null/)
})

test('current primary asset candidates remain unpromoted until reviewed', () => {
  for (const id of ['home-entry-chamber-model-v1', 'portal-ring-master-glb-v1', 'urai-orb-avatar-glb-v1']) {
    const start = manifest.indexOf(`id: '${id}'`)
    assert.notEqual(start, -1)
    const entry = manifest.slice(start, start + 700)
    assert.match(entry, /status: 'future'/)
    assert.match(entry, /fallbackAssetId:/)
  }
})

test('the currently named final procedural world is not accepted as final authority', () => {
  assert.match(runtime, /FinalHomeWorld/)
  assert.match(runtime, /data-home-visual-owner="final-coherent-sanctuary"/)
  assert.match(procedural, /capsuleGeometry/)
  assert.match(procedural, /const MEMORY_SCENES =/)
  assert.match(procedural, /place-loved|ride-home|voices-dinner/)
  assert.match(procedural, /Open Orb directly/)
  assert.match(procedural, /Open Ground directly/)
  assert.match(procedural, /Open Life Map directly/)
  assert.match(authority, /reclassified as a fallback implementation/)
})
