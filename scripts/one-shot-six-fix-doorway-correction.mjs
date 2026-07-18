import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

const doorwayContract = 'urai-tier1/tests/persistent-world-doorway-regression.test.mjs'
{
  const source = read(doorwayContract)
  const lines = source.split('\n')
  const start = lines.findIndex((line) =>
    line.includes("const demoMemoryQuery = 'memoryId=demo%3Aquiet-reset")
    || line.includes('button\\[data-world-target=\\\\"focus\\\\"\\]')
    || line.includes("check\\.name === 'life-map-to-focus'"),
  )
  const sourceEnd = lines.findIndex((line, index) => index >= start && line.includes('source = source\\.replaceAll'))
  const waitEnd = lines.findIndex((line, index) => index >= start && line.includes('waitForURL'))
  const end = sourceEnd >= start ? sourceEnd : waitEnd
  if (start < 0 || end < start) throw new Error(`Expected doorway audit assertion block not found in ${doorwayContract}`)

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
{
  const source = read(liveAudit)
  const lines = source.split('\n')
  const indexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includes('let found = await firstVisible(page, check.selectors)') && line.includes('Open Orb travel controls'))
    .map(({ index }) => index)
  if (indexes.length !== 1) throw new Error(`Expected exactly one current audit fallback replacement in ${liveAudit}; found ${indexes.length}`)

  const strictReplacement = `    let found = await firstVisible(page, check.selectors)
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
    }`

  lines[indexes[0]] = `    \`${strictReplacement}\`,`
  write(liveAudit, lines.join('\n'))
}
