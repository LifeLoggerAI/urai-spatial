import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const bridgePath = path.join(root, 'src/app/UraiFinalAssetSpineBridge.tsx')
const layoutPath = path.join(root, 'src/app/layout.tsx')
const manifestPath = path.join(root, 'public/assets/urai/final/manifests/urai-final-assets.json')

test('final asset spine bridge exists and maps core routes to final asset spine paths', () => {
  const bridge = fs.readFileSync(bridgePath, 'utf8')

  for (const expected of [
    'home-threshold-desktop.svg',
    'ground-realm-desktop.svg',
    'lifemap-galaxy-field-desktop.svg',
    'focus-memory-chamber-desktop.svg',
    'replay-cinematic-stage-desktop.svg',
    'mirror-reflection-realm-desktop.svg',
    'passport-vault-desktop.svg',
    'status-system-pulse-desktop.svg',
    'orb-idle.svg',
  ]) {
    assert.match(bridge, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(bridge, /data-urai-final-asset-spine="runtime-consumed"/)
  assert.match(bridge, /data-testid="urai-final-asset-spine-bridge"/)
})

test('root layout mounts final asset spine bridge', () => {
  const layout = fs.readFileSync(layoutPath, 'utf8')
  assert.match(layout, /UraiFinalAssetSpineBridge/)
  assert.match(layout, /<UraiFinalAssetSpineBridge \/>/)
})

test('final asset spine manifest remains present and route tiered', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  for (const route of ['home', 'ground', 'life-map', 'focus', 'replay', 'mirror', 'passport', 'status']) {
    assert.ok(manifest.routes[route], `missing route ${route}`)
  }
  assert.ok(manifest.shared['shared/orb'])
})
