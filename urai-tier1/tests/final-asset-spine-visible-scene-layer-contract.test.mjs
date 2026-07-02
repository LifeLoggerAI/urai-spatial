import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const layerPath = path.join(root, 'src/app/UraiFinalAssetSpineSceneLayer.tsx')
const layoutPath = path.join(root, 'src/app/layout.tsx')
const cssPath = path.join(root, 'src/app/urai-aaaa-final-pass.css')

test('visible final asset spine scene layer maps route assets', () => {
  const layer = fs.readFileSync(layerPath, 'utf8')

  for (const expected of [
    'home-threshold-desktop.svg',
    'ground-realm-desktop.svg',
    'lifemap-galaxy-field-desktop.svg',
    'focus-memory-chamber-desktop.svg',
    'replay-cinematic-stage-desktop.svg',
    'mirror-reflection-realm-desktop.svg',
    'passport-vault-desktop.svg',
    'status-system-pulse-desktop.svg',
  ]) {
    assert.match(layer, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(layer, /data-urai-final-scene-layer="visible-route-asset"/)
  assert.match(layer, /data-testid="urai-final-asset-spine-scene-layer"/)
})

test('root layout mounts visible scene layer before runtime proof bridge', () => {
  const layout = fs.readFileSync(layoutPath, 'utf8')
  assert.match(layout, /UraiFinalAssetSpineSceneLayer/)
  assert.match(layout, /<UraiFinalAssetSpineSceneLayer \/>/)
  assert.ok(
    layout.indexOf('<UraiFinalAssetSpineSceneLayer />') < layout.indexOf('<UraiFinalAssetSpineBridge />'),
    'scene layer should mount before hidden bridge proof'
  )
})

test('global css keeps scene layer safe and non-interactive', () => {
  const css = fs.readFileSync(cssPath, 'utf8')
  assert.match(css, /URAI final asset spine visible scene layer/)
  assert.match(css, /pointer-events:\s*none/)
  assert.match(css, /z-index:\s*0/)
  assert.match(css, /prefers-reduced-motion/)
})
