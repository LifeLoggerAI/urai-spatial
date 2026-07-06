import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const contractPath = new URL('../src/lib/spatial-system-contract.ts', import.meta.url)
const source = readFileSync(contractPath, 'utf8')

const requiredRoutes = [
  '/',
  '/about',
  '/home',
  '/ground',
  '/spatial',
  '/life-map',
  '/focus',
  '/replay',
  '/mirror',
  '/passport',
  '/status',
  '/privacy',
  '/privacy-controls',
  '/location-map',
  '/ascent',
  '/unwind',
  '/demo',
  '/demo/life-map',
  '/demo/replay-film',
  '/spatial/life-map',
  '/spatial/life-map-r3f',
  '/spatial/ar-vr',
  '/terms',
]

test('spatial system contract lists every active public route', () => {
  for (const route of requiredRoutes) {
    assert.match(source, new RegExp(`['"]${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`), `missing route ${route}`)
  }
})

test('smoke coverage derives from the canonical route registry', () => {
  assert.match(source, /export const spatialSmokeCoverage = \[/)
  assert.match(source, /\.\.\.Object\.values\(spatialRoutes\)/)
  assert.match(source, /smokeCoverage: spatialSmokeCoverage/)
})

test('privacy information and operational controls remain distinct', () => {
  assert.match(source, /privacy: ['"]\/privacy['"]/)
  assert.match(source, /privacyControls: ['"]\/privacy-controls['"]/)
})
