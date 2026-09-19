import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const worldTypes = read('src/spatial/world/worldTypes.ts')
const registry = read('src/spatial/world/destinationRegistry.ts')
const provider = read('src/spatial/world/WorldStateProvider.tsx')
const controller = read('src/spatial/world/WorldTransitionController.tsx')
const gateway = read('src/spatial/world/GroundGateway.tsx')
const shell = read('src/spatial/world/UraiWorldShell.tsx')
const layout = read('src/app/layout.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')

test('Tier-0 canon defines the required persistent-world destinations', () => {
  for (const destination of [
    'home',
    'infrastructure-hub',
    'mirror',
    'passport',
    'privacy-controls',
    'location-map',
    'focus',
    'replay',
  ]) {
    assert.match(worldTypes, new RegExp(`['"]${destination}['"]`))
    assert.match(registry, new RegExp(`['"]${destination}['"]`))
  }

  assert.match(worldTypes, /living-world/)
  assert.match(worldTypes, /infrastructure-world/)
  assert.match(worldTypes, /transition/)
})

test('Ground is the lived physical world while retaining its compatibility destination id', () => {
  assert.match(registry, /id:\s*['"]infrastructure-hub['"][\s\S]*label:\s*['"]Ground['"][\s\S]*href:\s*['"]\/ground['"][\s\S]*layer:\s*['"]living-world['"]/)
  assert.match(registry, /entryPortal:\s*['"]home-ground['"]/)
  assert.match(registry, /cameraCheckpoint:\s*['"]ground-first-person-arrival['"]/)
  assert.match(registry, /environmentalForm:\s*['"]lived-physical-world['"]/)
  assert.match(registry, /\[\s*['"]\/ground['"]\s*,\s*['"]infrastructure-hub['"]\s*\]/)
  assert.match(gateway, /destination:\s*['"]infrastructure-hub['"]/)
  assert.match(gateway, /href:\s*['"]\/ground\?from=home-ground['"]/)
  assert.match(gateway, /explore your physical lived world in first person/)
  assert.match(gateway, /data-ground-gateway=['"]semantic-access-only['"]/)
  assert.match(gateway, /Place data remains private and consent controlled/)
  assert.doesNotMatch(gateway, /Hidden Infrastructure|private infrastructure world|Enter below/)
  assert.match(gateway, /type=['"]button['"]/)
})

test('Home stays calm and exposes Ground through world geometry without tutorial residue', () => {
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-runtime-portals/)
  assert.doesNotMatch(homeRuntime, />Mirror</)
  assert.doesNotMatch(homeRuntime, />Passport</)
  assert.doesNotMatch(homeCanvas, /data-urai-home-portal/)
  assert.doesNotMatch(homeCanvas, /const portals/)
  assert.match(homeCanvas, /data-tier0-ground-gateway=['"]true['"]/)
  assert.match(homeCanvas, /requestUraiWorldTravel/)
  assert.match(homeCanvas, /destination:\s*['"]infrastructure-hub['"]/)
  assert.match(homeCanvas, /href:\s*['"]\/ground\/['"]/)
  assert.doesNotMatch(homeCanvas, /tap the ground to enter below|Drag to look/)
})

test('The root application owns one persistent world shell', () => {
  assert.match(layout, /WorldRuntimeBoundary/)
  assert.match(layout, /<WorldRuntimeBoundary>/)
  assert.match(shell, /data-testid=['"]urai-persistent-world-shell['"]/)
  assert.match(shell, /<GroundGateway\s*\/>/)
  assert.match(shell, /WorldTransitionController/)
})

test('Travel preserves context and supports deterministic reversal', () => {
  for (const key of ['memoryId', 'thread', 'personId', 'placeId', 'manifestId', 'privacyMode']) {
    assert.match(controller, new RegExp(`['"]${key}['"]`))
  }
  assert.match(provider, /previousDestination/)
  assert.match(provider, /cameraCheckpoint/)
  assert.match(controller, /event\.key !== ['"]Escape['"]/)
  assert.match(controller, /urai-world-home-checkpoint/)
  assert.match(controller, /router\.push\(href\)/)
})

test('Motion timings honor standard, deep-travel, and reduced-motion contracts', () => {
  assert.match(controller, /return 260/)
  assert.match(controller, /return 1900/)
  assert.match(controller, /return 1100/)
  assert.match(controller, /prefers-reduced-motion:\s*reduce/)
})
