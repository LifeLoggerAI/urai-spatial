import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/components/lifemap/RealLifeMapGalaxy.tsx', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const flat = source.replace(/\s+/g, ' ')

test('LifeMap route uses the final RealLifeMapGalaxy owner', () => {
  assert.match(page, /RealLifeMapGalaxy/, 'Life Map route must render RealLifeMapGalaxy.')
  assert.doesNotMatch(page, /LifeMapScene/, 'Life Map route must not revert to the obsolete LifeMapScene owner.')
})

test('RealLifeMapGalaxy preserves 34 memory stars and selected-star camera pull', () => {
  assert.match(source, /Array\.from\(\{ length: 34 \}/, 'Life Map must preserve thirty-four memory stars.')
  assert.match(source, /selected, setSelected/, 'Life Map must preserve selected star state.')
  assert.match(source, /--pull-x/, 'Life Map must preserve selected-star horizontal camera pull.')
  assert.match(source, /--pull-y/, 'Life Map must preserve selected-star vertical camera pull.')
  assert.match(source, /--selected-x/, 'Life Map must preserve selected star x focus variable.')
  assert.match(source, /--selected-y/, 'Life Map must preserve selected star y focus variable.')
})

test('LifeMap stars route into Focus and Replay with memory identity', () => {
  assert.match(source, /openFocus/, 'Life Map must expose Focus entry.')
  assert.match(source, /openReplay/, 'Life Map must expose Replay entry.')
  assert.match(flat, /router\.push\(`\/focus\?memoryId=\$\{encodeURIComponent\(selected\.id\)\}`\)/, 'Focus route must carry selected memory identity.')
  assert.match(flat, /router\.push\(`\/replay\?memoryId=\$\{encodeURIComponent\(selected\.id\)\}&manifestId=replay-recovery-thread`\)/, 'Replay route must carry selected memory identity.')
  assert.match(source, /onDoubleClick/, 'Stars must support double click into Focus.')
  assert.match(source, /Double click \/ Enter Focus/, 'Selected star must expose the Focus cue.')
})

test('LifeMap visual language remains asset-backed and mobile-safe', () => {
  assert.match(source, /lifeMapAssets\.primary/, 'Life Map must use the registered primary asset stack.')
  assert.match(source, /lifeMapAssets\.accents\.threshold/, 'Life Map stars must use registered node imagery.')
  assert.match(source, /assetCssStack/, 'Life Map must render asset CSS stacks.')
  assert.match(source, /organicDust/, 'Life Map must preserve organic dust atmosphere.')
  assert.match(source, /portalRail/, 'Life Map must keep route rail navigation.')
  assert.match(source, /@media \(max-width: 760px\)/, 'Life Map must preserve mobile layout handling.')
})
