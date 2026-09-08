import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const generator = readFileSync(new URL('../scripts/generate-home-authored-v191-assets.mjs', import.meta.url), 'utf8')

test('V197 replaces the rejected Ground prop pile with integrated environmental architecture', () => {
  assert.match(generator, /home-v197-ground-integrated-weathered-foundation/)
  assert.match(generator, /home-v197-ground-continuous-sheltering-memory-wall/)
  assert.match(generator, /home-v197-ground-grown-in-place-memory-path/)
  assert.doesNotMatch(generator, /home-v196-ground-gathering-seat|home-v196-ground-sheltering-root/)
})

test('V197 replaces the Life Map stick-and-ball diagram with a grounded observatory place', () => {
  assert.match(generator, /home-v197-life-map-integrated-memory-observatory-foundation/)
  assert.match(generator, /home-v197-life-map-weathered-memory-ledger/)
  assert.match(generator, /home-v197-life-map-ascending-observatory-path/)
  assert.doesNotMatch(generator, /home-v196-life-map-ascending-memory-branch|home-v196-life-map-suspended-memory-canopy/)
})

test('V197 gives the single connected Orb a scarred asymmetric silhouette', () => {
  assert.match(generator, /portLobe/)
  assert.match(generator, /starboardScar/)
  assert.match(generator, /home-v197-single-connected-scarred-stratified-living-memory-heart/)
})

test('V197 authored GLBs are committed, nontrivial and transport-safe', () => {
  for (const name of ['home-continuous-landscape-v191.glb','home-ground-place-v191.glb','home-life-map-place-v191.glb','urai-living-memory-heart-v191.glb']) {
    const size = statSync(new URL(`../public/assets/urai/home-production/authored-v191/${name}`, import.meta.url)).size
    assert.ok(size > 90_000, `${name} must retain substantial authored geometry`)
    assert.ok(size < 780_000, `${name} must remain below the connector-safe binary transport ceiling`)
  }
})

test('V199 runtime composes both places and the Orb inside the initial portrait-safe frame', () => {
  const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
  assert.match(runtime, /home-v199-\$\{side\}-authored-memory-place/)
  assert.match(runtime, /position=\{\[isGround\?1\.15:-1\.15,isGround\?-0\.82:-0\.84,0\]\}/)
  assert.match(runtime, /scale=\{isGround\?\[1\.34,1\.34,1\.34\]:\[0\.82,0\.82,0\.82\]\}/)
  assert.match(runtime, /home-v199-authored-single-connected-scarred-living-memory-heart/)
  assert.match(runtime, /scale=\{\[0\.34,0\.40,0\.32\]\}/)
})
