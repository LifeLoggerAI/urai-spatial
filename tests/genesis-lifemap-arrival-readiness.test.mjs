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
  const stability=readFileSync(new URL('../scripts/genesis-lifemap-stable-arrival.mjs',import.meta.url),'utf8')
  assert.ok(stability.includes('LIFEMAP_REAL_WEBGL_NOT_STABLE'))
  assert.ok(capture.includes("from './genesis-lifemap-stable-arrival.mjs'"))
  assert.ok(!capture.includes('await page.waitForTimeout(450)'))
})
test('pixel validator failure reason is retained and release stays hold',()=>{
  assert.ok(capture.includes('pixelPreflightFailure'))
  assert.ok(capture.includes('PHYSICAL_ASCENT_PIXEL_PREFLIGHT_REJECTED'))
  assert.ok(capture.includes('NO-GO/HOLD'))
  assert.ok(capture.includes('receipt.completed=true'))
})

test('private review refuses pre-existing evidence and samples destination continuously',()=>{
  assert.ok(capture.includes('PRIVATE_VIDEO_DESTINATION_NOT_EMPTY'))
  assert.ok(capture.includes('requireStableLifeMapArrival({isReady:ready'))
  assert.ok(capture.includes('lifeMapStabilitySamples'))
  assert.ok(capture.includes('RECEIPT_WRITE_FAILED'))
  assert.ok(!capture.includes('await page.waitForTimeout(900)'))
})

test('render proof only counts visible mounted scene and fresh WebGL frames',()=>{
  assert.ok(world.includes('scene.traverseVisible((object) =>'))
  assert.ok(world.includes('canvas.isConnected && !gl.getContext().isContextLost()'))
  assert.ok(world.includes('frames.current >= 4 && calls > 0 && triangles > 0'))
  assert.ok(world.includes('const element = gl.domElement.closest<HTMLElement>'))
  assert.ok(!world.includes("?? document.querySelector<HTMLElement>('[data-testid=\"urai-true-3d-life-map\"]')"))
})
