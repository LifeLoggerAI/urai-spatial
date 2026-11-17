import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const homeRuntime = fs.readFileSync(new URL('../src/app/HomeSpatialRuntimeLayer.tsx', import.meta.url), 'utf8')
const worldEvents = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const productionHome = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')

test('active WebGL Home accessibility control enters the existing scene-governed Ascent', () => {
  assert.match(homeRuntime, /<HomeSemanticNavigation spatialAvailable spatialReady=\{assetsReady\} \/>/)
  assert.match(homeRuntime, /spatialAvailable \? \(/)
  assert.match(homeRuntime, /data-home-ascent-authority="governed-scene-transition"/)
  assert.match(homeRuntime, /disabled=\{!spatialReady\}/)
  assert.match(homeRuntime, /onClick=\{ascendToLifeMap\}/)
  assert.match(homeRuntime, /requestUraiWorldTravel\(\{[\s\S]*?destination: 'life-map',[\s\S]*?entryPortal: 'home-sky',[\s\S]*?cameraCheckpoint: 'home-sky-ascent'/)
  assert.match(worldEvents, /function shouldBeginHomeAscent\(request/)
  assert.match(worldEvents, /if \(shouldBeginHomeAscent\(request\)\) \{[\s\S]*?scene\.enterLifeMap\(\)/)
  assert.match(productionHome, /const ascending = store\.phase === 'ASCENT'/)
  assert.match(productionHome, /cameraCheckpoint: 'home-sky-ascent-complete'/)
})

test('no-WebGL and renderer-failure paths retain direct accessible Life Map fallback', () => {
  assert.match(homeRuntime, /<HomeSemanticNavigation spatialAvailable=\{false\} spatialReady=\{false\} \/>/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly without WebGL"/)
  assert.match(homeRuntime, /<a href="\/life-map\/\?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete"/)
  assert.match(homeRuntime, /webglAvailable === false \|\| rendererState === 'failed'/)
})
