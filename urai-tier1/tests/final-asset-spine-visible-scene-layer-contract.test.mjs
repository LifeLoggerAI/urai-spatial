import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const layoutPath = path.join(root, 'src/app/layout.tsx')
const bridgePath = path.join(root, 'src/app/UraiFinalAssetSpineBridge.tsx')

test('final asset spine remains an evidence bridge, not a visible route owner', () => {
  const layout = fs.readFileSync(layoutPath, 'utf8')
  const bridge = fs.readFileSync(bridgePath, 'utf8')

  assert.doesNotMatch(layout, /UraiFinalAssetSpineSceneLayer/)
  assert.doesNotMatch(layout, /<UraiFinalAssetSpineSceneLayer\s*\/>/)
  assert.match(layout, /<UraiFinalAssetSpineBridge\s*\/>/)
  assert.match(bridge, /data-urai-final-asset-spine="runtime-consumed"/)
  assert.match(bridge, /position:\s*'fixed'/)
  assert.match(bridge, /width:\s*1/)
  assert.match(bridge, /height:\s*1/)
  assert.match(bridge, /opacity:\s*0/)
})

test('real route content remains the only visible product owner', () => {
  const layout = fs.readFileSync(layoutPath, 'utf8')

  assert.match(layout, /<WorldRuntimeBoundary>/)
  assert.match(layout, /\{children\}/)
  assert.doesNotMatch(layout, /UraiCinematicBackdrop/)
})
