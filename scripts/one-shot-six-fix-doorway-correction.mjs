import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)
const replaceOnce = (path, before, after) => {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const doorwayContract = 'urai-tier1/tests/persistent-world-doorway-regression.test.mjs'
{
  const source = read(doorwayContract)
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.includes("const demoMemoryQuery = 'memoryId=demo%3Aquiet-reset") || line.includes('button\\[data-world-target=\\\\"focus\\\\"\\]'))
  const sourceEnd = lines.findIndex((line, index) => index >= start && line.includes('source = source\\.replaceAll'))
  const waitEnd = lines.findIndex((line, index) => index >= start && line.includes('waitForURL'))
  const end = sourceEnd >= start ? sourceEnd : waitEnd
  if (start < 0 || end < start) throw new Error(`Expected weakened doorway assertions not found in ${doorwayContract}`)
  lines.splice(start, end - start + 1,
    String.raw`  assert.match(visualAudit, /check\.name === 'life-map-to-focus'/)`,
    String.raw`  assert.match(visualAudit, /summary:has-text\("Map controls"\)/)`,
    String.raw`  assert.match(visualAudit, /\.life-map-accessibility-menu button/)`,
    String.raw`  assert.match(visualAudit, /check\.name !== 'life-map-to-focus'/)`,
    String.raw`  assert.match(visualAudit, /Open Orb travel controls/)`,
    String.raw`  assert.match(visualAudit, /waitForURL\(\(url\) => url\.toString\(\)\.includes\(check\.expected\), \{ timeout: 7000 \}\)/)`,
  )
  write(doorwayContract, lines.join('\n'))
}

const liveAudit = 'scripts/run-live-visual-audit-current.mjs'
replaceOnce(
  liveAudit,
  `    "    let found = await firstVisible(page, check.selectors)\\n    if (!found) {\\n      const orb = page.locator('button[aria-label=\\\"Open Orb travel controls\\\"]')\\n      if (await orb.isVisible({ timeout: 1200 }).catch(() => false)) {\\n        await orb.click({ timeout: 10000 })\\n        await page.waitForTimeout(250)\\n        found = await firstVisible(page, check.selectors)\\n      }\\n    }",`,
  `    \`    let found = await firstVisible(page, check.selectors)
    if (!found && check.name === 'life-map-to-focus') {
      const mapControls = page.locator('summary:has-text("Map controls")')
      if (await mapControls.isVisible({ timeout: 1200 }).catch(() => false)) {
        await mapControls.click({ timeout: 10000 })
        const firstMemory = page.locator('.life-map-accessibility-menu button').filter({ hasNotText: /Enter Focus|Replay|Overview|Ground|Home/i }).first()
        if (await firstMemory.isVisible({ timeout: 1200 }).catch(() => false)) {
          await firstMemory.click({ timeout: 10000 })
          await page.waitForTimeout(350)
          found = await firstVisible(page, check.selectors)
        }
      }
    }
    if (!found && check.name !== 'life-map-to-focus') {
      const orb = page.locator('button[aria-label="Open Orb travel controls"]')
      if (await orb.isVisible({ timeout: 1200 }).catch(() => false)) {
        await orb.click({ timeout: 10000 })
        await page.waitForTimeout(250)
        found = await firstVisible(page, check.selectors)
      }
    }\`,`,
)
