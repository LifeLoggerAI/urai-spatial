import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const assetOwner = await readFile(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const runtime = await readFile(new URL('../src/app/HomeSpatialRuntimeLayer.tsx', import.meta.url), 'utf8')

test('late asset readiness preserves the existing input and three-frame Home threshold', () => {
  assert.match(assetOwner, /const assetsReady = world\.dataset\.homeAssetsReady === 'true'/)
  assert.match(assetOwner, /const inputReady = world\.dataset\.homeInputReady === 'true'/)
  assert.match(assetOwner, /world\.dataset\.homeInteractionReady = assetsReady && inputReady \? 'true' : 'false'/)
  assert.match(assetOwner, /world\.dataset\.homeReady = assetsReady && inputReady && Number\.isFinite\(renderedFrames\) && renderedFrames >= 3 \? 'true' : 'false'/)
  assert.doesNotMatch(assetOwner, /world\.dataset\.homeReady = assetsReady \? 'true' : 'false'/)
})

test('asset-owner observer covers the readiness transition without polling or fabricated readiness', () => {
  assert.match(assetOwner, /attributeFilter: \['data-home-player-x', 'data-home-player-z', 'data-home-assets-ready', 'data-home-input-ready'\]/)
  assert.match(assetOwner, /lastReportedAssetsReady\.current !== assetsReady/)
  assert.match(assetOwner, /onAssetsReadyChange\?\.\(assetsReady\)/)
})

test('the enclosing runtime consumes exact child asset readiness', () => {
  assert.match(runtime, /const synchronizeAssetsReady = useCallback\(\(ready: boolean\) => \{/)
  assert.match(runtime, /runtimeRef\.current\?\.setAttribute\('data-home-assets-ready', ready \? 'true' : 'false'\)/)
  assert.match(runtime, /setAssetsReady\(ready\)/)
  assert.match(runtime, /onAssetsReadyChange=\{synchronizeAssetsReady\}/)
  assert.match(runtime, /data-home-assets-ready=\{assetsReady \? 'true' : 'false'\}/)
})
