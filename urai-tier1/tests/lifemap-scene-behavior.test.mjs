import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/components/lifemap/RealLifeMapGalaxy.tsx', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')

test('LifeMap route uses the final RealLifeMapGalaxy owner', () => {
  assert.match(page, /RealLifeMapGalaxy/, 'Life Map route must render RealLifeMapGalaxy.')
  assert.doesNotMatch(page, /LifeMapScene/, 'Life Map route must not revert to the obsolete LifeMapScene owner.')
})

test('RealLifeMapGalaxy preserves memory stars and selected-star camera pull', () => {
  assert.ok(source.includes('Array.from({ length: 34 }'), 'Life Map must preserve thirty-four memory stars.')
  assert.ok(source.includes('selected, setSelected'), 'Life Map must preserve selected star state.')
  assert.ok(source.includes('--pull-x'), 'Life Map must preserve selected-star horizontal camera pull.')
  assert.ok(source.includes('--pull-y'), 'Life Map must preserve selected-star vertical camera pull.')
  assert.ok(source.includes('--selected-x'), 'Life Map must preserve selected star x focus variable.')
  assert.ok(source.includes('--selected-y'), 'Life Map must preserve selected star y focus variable.')
})

test('LifeMap stars route into Focus and Replay with selected memory identity', () => {
  assert.ok(source.includes('openFocus'), 'Life Map must expose Focus entry.')
  assert.ok(source.includes('openReplay'), 'Life Map must expose Replay entry.')
  assert.ok(source.includes('focus?memoryId='), 'Focus route must carry selected memory identity.')
  assert.ok(source.includes('replay?memoryId='), 'Replay route must carry selected memory identity.')
  assert.ok(source.includes('const focusHref = (memoryId: string)'), 'Focus route helper must accept one memory id.')
  assert.ok(source.includes('const replayHref = (memoryId: string)'), 'Replay route helper must accept one memory id.')
  assert.ok(source.includes('encodeURIComponent(memoryId)'), 'Memory ids must be encoded inside route helpers.')
  assert.ok(source.includes('focusHref(selected.id)'), 'Focus must open the selected star identity.')
  assert.ok(source.includes('replayHref(selected.id)'), 'Replay must open the selected star identity.')
  assert.ok(source.includes('onDoubleClick'), 'Stars must support double click into Focus.')
  assert.ok(source.includes('Double click / Enter Focus'), 'Selected star must expose the Focus cue.')
})

test('LifeMap visual language remains asset-backed and mobile-safe', () => {
  assert.ok(source.includes('lifeMapAssets.primary'), 'Life Map must use the registered primary asset stack.')
  assert.ok(source.includes('lifeMapAssets.accents.threshold'), 'Life Map stars must use registered node imagery.')
  assert.ok(source.includes('assetCssStack'), 'Life Map must render asset CSS stacks.')
  assert.ok(source.includes('organicDust'), 'Life Map must preserve organic dust atmosphere.')
  assert.ok(source.includes('portalRail'), 'Life Map must keep route rail navigation.')
  assert.ok(source.includes('@media (max-width: 760px)'), 'Life Map must preserve mobile layout handling.')
})
