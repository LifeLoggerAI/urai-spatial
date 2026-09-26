import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../package.json', import.meta.url))
const { chromium } = require('playwright')
const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
// Use the production global cascade, persistent-world rules, and route styles.
const styles = []
for (const entry of ['src/app/layout.tsx', 'src/spatial/world/UraiWorldShell.tsx', 'src/app/replay/CinematicReplayClient.tsx']) {
  for (const match of read(entry).matchAll(/import ['"]([^'"]+\.css)['"]/g)) {
    const file = match[1].startsWith('@/') ? `src/${match[1].slice(2)}` : path.join(path.dirname(entry), match[1])
    styles.push(read(file))
  }
}
for (const file of ['replay-controls.css', 'replay-production-polish.css', 'replay-final-rail-order.css']) {
  styles.push(read(`src/app/replay/${file}`))
}
styles.push(read('src/app/replay/CinematicReplayClient.tsx').match(/const replayCss = `([^`]+)`/)[1])
const css = styles.join('\n')
assert.match(css, /overflow: clip !important;/)
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  args: ['--no-sandbox'],
})
const intersects = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
async function fixture(width, height, baseline, reducedMotion = false) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
  await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseline ? css.replace('overflow: clip !important;', 'overflow: hidden !important;') : css}</style>
    <div class="urai-world-runtime" data-world-destination="replay"><main class="replayWorld" data-memory-status="demo">
    <div class="replaySpatialCanvas"></div>
    <header><p>DEMO FIXTURE · NOT PERSONAL DATA</p><h1>The Quiet Reset</h1><span>Memory</span><button class="unwind">Focus</button></header>
    <details class="truthGuide"><summary>Truth</summary><div><strong>Memory context</strong><p>Unknown information stays unbuilt.</p></div></details>
    <details class="transcript"><summary>Transcript</summary><p>Recorded transcript.</p></details>
    </main></div>`)
  return page
}
try {
  const old = await fixture(390, 844, true)
  const baseline = await old.locator('.replayWorld').evaluate(node => {
    node.scrollTop = 110
    return { scroll: node.scrollTop, focus: node.querySelector('.unwind').getBoundingClientRect().toJSON(), truth: node.querySelector('.truthGuide').getBoundingClientRect().toJSON() }
  })
  assert.ok(baseline.scroll > 0, 'baseline must reproduce unintended scroll')
  assert.ok(intersects(baseline.focus, baseline.truth), 'baseline must reproduce retained Truth/Focus collision')
  await old.close()

  let checks = 0
  for (const [width, height] of [[320, 900], [390, 844], [430, 932], [568, 320], [700, 900], [844, 390], [1440, 900]]) {
    for (const reduced of [false, true]) {
      const page = await fixture(width, height, false, reduced)
      for (const opened of [false, true]) {
        const bounds = await page.locator('.replayWorld').evaluate((node, opened) => {
          node.querySelector('.truthGuide').open = opened
          node.scrollTo(1000, 1000)
          node.querySelector('.truthGuide summary').focus()
          return { scroll: [node.scrollLeft, node.scrollTop], focus: node.querySelector('.unwind').getBoundingClientRect().toJSON(), truth: node.querySelector('.truthGuide').getBoundingClientRect().toJSON() }
        }, opened)
        assert.deepEqual(bounds.scroll, [0, 0], `viewport scroll ${width}x${height}`)
        assert.equal(intersects(bounds.focus, bounds.truth), false, `Truth/Focus collision ${width}x${height}`)
        for (const rect of [bounds.focus, bounds.truth]) assert.ok(rect.x >= 0 && rect.y >= 0 && rect.right <= width && rect.bottom <= height, `clipped control ${width}x${height}`)
        checks++
      }
      await page.locator('.truthGuide summary').click()
      assert.equal(await page.locator('.truthGuide').evaluate(n => n.open), false, 'native disclosure stays operable')
      await page.locator('.unwind').click()
      await page.close()
    }
  }
  console.log(`Replay viewport: baseline collision reproduced; ${checks} production-CSS geometry cases passed in Chromium ${browser.version()}`)
} finally {
  await browser.close()
}
