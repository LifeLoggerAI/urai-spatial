import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  HOME_INTERPRETIVE_SPLAT_PREFIX,
  resolveHomeInterpretiveSplatAsset,
} from '../src/spatial/home/homeInterpretiveSplatPolicy.ts'

test('Home interpretive splat policy is fail-closed and local-only', () => {
  assert.equal(HOME_INTERPRETIVE_SPLAT_PREFIX, '/assets/urai/home-production/interpretive/')
  assert.equal(resolveHomeInterpretiveSplatAsset(undefined), null)
  assert.equal(resolveHomeInterpretiveSplatAsset('   '), null)
  assert.equal(
    resolveHomeInterpretiveSplatAsset('/assets/urai/home-production/interpretive/sanctuary-v1.splat'),
    '/assets/urai/home-production/interpretive/sanctuary-v1.splat',
  )

  for (const candidate of [
    'https://storage.example.invalid/private.splat',
    '/assets/urai/captured-reality/private.splat',
    '/assets/urai/home-production/interpretive/../private.splat',
    '/assets/urai/home-production/interpretive/sanctuary-v1.splat?sig=private',
    '/assets/urai/home-production/interpretive/sanctuary-v1.splat#fragment',
    '/assets/urai/home-production/interpretive/not-a-splat.glb',
    '\\assets\\urai\\home-production\\interpretive\\sanctuary-v1.splat',
  ]) {
    assert.throws(() => resolveHomeInterpretiveSplatAsset(candidate), /HOME_INTERPRETIVE_SPLAT_ASSET_NOT_APPROVED/)
  }
})

test('Home interpretive Gaussian layer preserves truth, collision, interaction and provenance ownership', () => {
  const adapter = fs.readFileSync(new URL('../src/spatial/home/HomeInterpretiveSplat.tsx', import.meta.url), 'utf8')
  const home = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')

  assert.match(adapter, /truthClass: 'INTERPRETIVE'/)
  assert.match(adapter, /autobiographical: false/)
  assert.match(adapter, /collisionOwner: 'conventional-home-proxies'/)
  assert.match(adapter, /interactionOwner: 'react-r3f-home-runtime'/)
  assert.match(adapter, /provenanceOwner: 'asset-factory'/)
  assert.match(home, /NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET/)
  assert.ok(home.includes('HOME_INTERPRETIVE_SPLAT_ASSET ? <HomeInterpretiveSplatEnvironment'))
  assert.ok(home.includes('<Terrain target={props.target} />'))
  assert.match(home, /<Thresholds onGround=/)
  assert.match(home, /<PlayerRig input=/)
})

test('Home interpretive environment is not mounted through private Captured Reality decision semantics', () => {
  const adapter = fs.readFileSync(new URL('../src/spatial/home/HomeInterpretiveSplat.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(adapter, /CapturedRealityRenderDecision/)
  assert.doesNotMatch(adapter, /decideCapturedRealityRender/)
  assert.doesNotMatch(adapter, /location\.context/)
  assert.doesNotMatch(adapter, /authorizedRuntimeUrl/)
})
