import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const layoutPath = path.join(root, 'src/app/layout.tsx')

test('root layout does not mount static placeholder route poster layers', () => {
  const layout = fs.readFileSync(layoutPath, 'utf8')

  assert.doesNotMatch(layout, /UraiCinematicBackdrop/)
  assert.doesNotMatch(layout, /UraiFinalAssetSpineSceneLayer/)
  assert.doesNotMatch(layout, /<UraiCinematicBackdrop\s*\/>/)
  assert.doesNotMatch(layout, /<UraiFinalAssetSpineSceneLayer\s*\/>/)
})

test('real route runtime and hidden evidence bridge remain mounted', () => {
  const layout = fs.readFileSync(layoutPath, 'utf8')

  assert.match(layout, /<WorldRuntimeBoundary>/)
  assert.match(layout, /<UraiAAAARoutePolish\s*\/>/)
  assert.match(layout, /<UraiFinalAssetSpineBridge\s*\/>/)
  assert.match(layout, /\{children\}/)
})
