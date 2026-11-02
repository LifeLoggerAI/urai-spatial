import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const scene=readFileSync(new URL('../urai-tier1/src/components/lifemap/ComposedLifeMapScene.tsx',import.meta.url),'utf8')
const world=readFileSync(new URL('../urai-tier1/src/components/lifemap/LifeMapProductionWorld.tsx',import.meta.url),'utf8')
const capture=readFileSync(new URL('../scripts/genesis-ascent-patched-review-capture.mjs',import.meta.url),'utf8')

test('original galaxy renders independently of slow memory-star assets',()=>{
  assert.ok(scene.includes('<LifeMapProductionWorld'))
  assert.ok(world.includes('<GalaxyDepth tier={profile.tier}'))
  assert.ok(world.includes('<Suspense fallback={null}>'))
  assert.ok(world.indexOf('<GalaxyDepth')<world.indexOf('<Suspense fallback={null}>'))
  assert.ok(world.includes('lifeMapAuthoredStarsMounted'))
})
test('render proof cannot claim complete arrival before authored stars mount',()=>{
  assert.ok(world.includes('authoredStars > 0'))
  assert.ok(world.includes('runtimeAsset === MEMORY_STAR_MODEL'))
  assert.ok(world.includes('lifeMapAuthoredStarsMounted = "0"'))
})
test('private recorder awaits real LifeMap rendering, not just the route',()=>{
  assert.ok(capture.includes("lifeMapRenderReady==='true'"))
  assert.ok(capture.includes('lifeMapAuthoredStarsMounted'))
  assert.ok(capture.includes('LIFEMAP_REAL_WEBGL_NOT_STABLE'))
  assert.ok(!capture.includes('await page.waitForTimeout(450)'))
})
test('pixel validator failure reason is retained and release stays hold',()=>{
  assert.ok(capture.includes('pixelPreflightFailure'))
  assert.ok(capture.includes('PHYSICAL_ASCENT_PIXEL_PREFLIGHT_REJECTED'))
  assert.ok(capture.includes('NO-GO/HOLD'))
  assert.ok(capture.includes('receipt.completed=true'))
})
