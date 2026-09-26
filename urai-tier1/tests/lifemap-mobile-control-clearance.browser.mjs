import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../package.json', import.meta.url))
const { chromium } = require('playwright')
const read = name => fs.readFileSync(new URL('../src/' + name, import.meta.url), 'utf8')
const styles = ['components/lifemap/CosmicComposedLifeMapScene.tsx', 'components/lifemap/LifeMapSemanticNavigator.tsx']
  .map(name => [...read(name).matchAll(/<style jsx(?: global)?>\{`([\s\S]*?)`\}<\/style>/g)].map(match => match[1]).join('\n')).join('\n')
const isolation = read('spatial/world/lifeMapProductionIsolation.css')
const previous = isolation.replace('right: max(12px,env(safe-area-inset-right)) !important; top: max(12px,env(safe-area-inset-top)) !important; bottom: auto !important;', 'right: 12px !important; bottom: max(12px,env(safe-area-inset-bottom)) !important;')
assert.notEqual(previous, isolation, 'regression must restore the original overlap rule')
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const overlap = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
async function measure(width, height, baseline = false) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(`<html class="urai-route-life-map"><style>*{box-sizing:border-box}body{margin:0}${styles}\n${baseline ? previous : isolation}</style>
    <main data-testid="urai-true-3d-life-map" data-life-map-mode="selected" data-life-map-phase="arrival">
      <header class="life-map-title"><strong>The Quiet Reset</strong><em>Disclosed sample — not your memories</em></header>
      <nav class="life-map-thresholds"><button class="focus-threshold"><strong>Enter Focus</strong></button><button class="replay-threshold"><strong>Replay</strong></button><button class="overview-return">Overview</button></nav>
    </main><button class="life-map-search-trigger" aria-label="Search and navigate Life Map">⌕</button></html>`)
  const boxes = await page.evaluate(() => Object.fromEntries(['life-map-search-trigger','life-map-title','life-map-thresholds'].map(name => {
    const r = document.querySelector('.' + name).getBoundingClientRect()
    return [name, { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height }]
  })))
  await page.close()
  return boxes
}
try {
  const old = await measure(390, 844, true)
  assert.ok(overlap(old['life-map-search-trigger'], old['life-map-thresholds']), 'preceding CSS must reproduce the retained overlap')
  for (const [width, height] of [[320,720],[360,800],[390,844],[430,932],[700,900],[844,390],[1440,900]]) {
    const boxes = await measure(width, height)
    const search = boxes['life-map-search-trigger']
    assert.ok(search.width >= 48 && search.height >= 48, `${width}: retain 48px target`)
    assert.ok(search.x >= 0 && search.y >= 0 && search.right <= width && search.bottom <= height, `${width}: contained`)
    assert.equal(overlap(search, boxes['life-map-thresholds']), false, `${width}: action rail remains clear`)
    assert.equal(overlap(search, boxes['life-map-title']), false, `${width}: title remains clear`)
  }
  console.log('Life Map search: preceding overlap reproduced; seven production-CSS viewport cases pass')
} finally { await browser.close() }
