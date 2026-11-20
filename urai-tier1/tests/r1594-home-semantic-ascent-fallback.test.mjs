import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const source=fs.readFileSync(new URL('../src/app/HomeSpatialRuntimeLayer.tsx',import.meta.url),'utf8')
test('governed 3D ascent only when real Home scene and assets are ready',()=>{
  assert.match(source,/spatialReady \? \(/)
  assert.match(source,/data-home-ascent-authority="governed-scene-transition" disabled=\{!spatialReady\}/)
})
test('unready visual Home has named semantic fallback, not fabricated completion',()=>{
  assert.match(source,/from=home-semantic&entryPortal=home-semantic-safe-fallback&cameraCheckpoint=home-assets-not-ready/)
  assert.match(source,/semantic-fallback-when-assets-unready/)
  assert.doesNotMatch(source,/from=home-semantic[^"\n]+ascent-complete/)
})
test('no WebGL retains the original accessible Life Map destination',()=>{
  assert.match(source,/from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete/)
  assert.match(source,/aria-label="Open Life Map directly without WebGL"/)
})
test('both fallbacks retain real Life Map gate and accessible Home navigation',()=>{
  assert.match(source,/data-testid="home-semantic-life-map"/)
  assert.match(source,/aria-label="Open Life Map directly while Home visuals are not ready"/)
  assert.match(source,/data-home-ascent-authority="semantic-fallback-when-assets-unready"/)
})
