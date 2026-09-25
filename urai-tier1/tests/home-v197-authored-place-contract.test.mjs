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
  assert.match(generator, /home-v200-life-map-integrated-weathered-memory-ledger/)
  assert.match(generator, /home-v197-life-map-ascending-observatory-path/)
  assert.doesNotMatch(generator, /home-v196-life-map-ascending-memory-branch|home-v196-life-map-suspended-memory-canopy/)
})

test('V201 gives the single connected Orb a folded asymmetric silhouette', () => {
  assert.match(generator, /new THREE\.TubeGeometry\(curve,144/)
  assert.match(generator, /const current=/)
  assert.match(generator, /home-v201-single-connected-folded-living-memory-mantle/)
})

test('V197 authored GLBs are committed, nontrivial and transport-safe', () => {
  for (const name of ['home-continuous-landscape-v191.glb','home-ground-place-v191.glb','home-life-map-place-v191.glb','urai-living-memory-heart-v191.glb']) {
    const size = statSync(new URL(`../public/assets/urai/home-production/authored-v191/${name}`, import.meta.url)).size
    assert.ok(size > 90_000, `${name} must retain substantial authored geometry`)
    assert.ok(size < 780_000, `${name} must remain below the connector-safe binary transport ceiling`)
  }
})

test('current Home runtime preserves one bodyless first-person world with physical Ground, sky Life Map, and authored Orb authority', () => {
  const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
  assert.match(runtime, /data-home-primary-owner="asset-driven"/)
  assert.match(runtime, /data-home-presence-presentation=\{firstPerson \? 'bodyless-first-person-home' : 'camera-only-transition'\}/)
  assert.match(runtime, /data-home-ground-entry="physical-world-surface"/)
  assert.match(runtime, /data-home-life-map-entry="visible-sky-broad-interaction"/)
  assert.match(runtime, /data-home-orb-runtime-asset=\{ORB_MODEL\}/)
  assert.match(runtime, /data-home-non-xr-body-policy="camera-only-no-hands-body-rig"/)
  assert.match(runtime, /HomeLaunchSanctuaryV254/)
})
