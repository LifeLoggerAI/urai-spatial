import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const scene=readFileSync(new URL('../urai-tier1/src/components/lifemap/ComposedLifeMapScene.tsx',import.meta.url),'utf8')
const world=readFileSync(new URL('../urai-tier1/src/components/lifemap/LifeMapProductionWorld.tsx',import.meta.url),'utf8')
const capture=readFileSync(new URL('../scripts/genesis-ascent-patched-review-capture.mjs',import.meta.url),'utf8')

test('original galaxy renders independently of slow memory-star assets',()=>{
  assert.match(scene,/<LifeMapProductionWorld/)
  assert.match(world,/<GalaxyDepth tier=\{profile\.tier\}/)
  assert.match(world,/<Suspense fallback=\{null\}>/)
  assert.ok(world.indexOf('<GalaxyDepth')<world.indexOf('<Suspense fallback={null}>'))
  assert.match(world,/data\.lifeMapAuthoredStarsMounted|dataset\.lifeMapAuthoredStarsMounted/)
})
test('render proof cannot claim complete arrival before authored stars mount',()=>{
  assert.match(world,/authoredStars > 0/)
  assert.match(world,/runtimeAsset === MEMORY_STAR_MODEL/)
  assert.match(world,/lifeMapAuthoredStarsMounted = "0"/)
})
test('private recorder awaits real LifeMap rendering, not just the route',()=>{
  assert.match(capture,/lifeMapRenderReady==='true'/)
  assert.match(capture,/lifeMapAuthoredStarsMounted/)
  assert.match(capture,/LIFEMAP_REAL_WEBGL_NOT_STABLE/)
  assert.doesNotMatch(capture,/await page\.waitForTimeout\(450\)/)
})
test('pixel validator failure reason is retained and release stays hold',()=>{
  assert.match(capture,/pixelPreflightFailure/)
  assert.match(capture,/PHYSICAL_ASCENT_PIXEL_PREFLIGHT_REJECTED/)
  assert.match(capture,/NO-GO\/HOLD/)
  assert.match(capture,/receipt\.completed=true/)
})
