import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(scriptDir, 'live-visual-audit.mjs')
const generatedPath = join(scriptDir, `.live-visual-audit-current-${process.pid}.mjs`)

const demoMemoryQuery = 'memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'
const replacements = new Map([
  ["markers: ['Own your life', 'Step inside yourself']", "markers: ['ENTER BELOW', 'URAI destination home. World layer living-world.']"],
  ["markers: ['Your real life has a place', 'private operating world']", "markers: ['URAI Ground', 'Private infrastructure, embodied.', 'Reception', 'Archive']"],
  ["markers: ['Life Map', 'Wheel', 'Drag', 'memory star']", "markers: ['URAI destination life-map.', 'World layer infrastructure-world.', 'Life Map independent memory universe']"],
  ["route: '/focus?memoryId=quiet-reset',", `route: '/focus?${demoMemoryQuery}',`],
  ["markers: ['The Quiet Reset', 'Selected memory camera chamber', 'Replay']", "markers: ['The Quiet Reset', 'Selected memory chamber.', 'Replay']"],
  ["route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',", `route: '/replay?${demoMemoryQuery}',`],
  ["markers: ['World online', 'Route matrix', 'Tracked']", "markers: ['Launch locked. Proof before expansion.', 'Tracked', 'Pending proof']"],
  ["markers: ['Step inside the Life Map', 'Quest', 'manual']", "markers: ['Explorable entry chamber', 'Enter VR in Quest', 'Desktop and mobile']"],
  [
    "'a[data-urai-audit-action=\"home-life-map\"]',",
    "'button[data-world-target=\"life-map\"]',\n      'a[data-urai-audit-action=\"home-life-map\"]',",
  ],
  [
    "'a[data-urai-audit-action=\"home-ground\"]',",
    "'button[data-world-target=\"infrastructure-hub\"]',\n      'a[data-urai-audit-action=\"home-ground\"]',",
  ],
  [
    "'a[data-urai-audit-action=\"life-map-focus\"]',",
    "'button[data-world-target=\"focus\"]',\n      'a[data-urai-audit-action=\"life-map-focus\"]',",
  ],
  [
    "start: '/focus?memoryId=quiet-reset',",
    `start: '/focus?${demoMemoryQuery}',`,
  ],
  [
    '    const found = await firstVisible(page, check.selectors)',
    `    let found = await firstVisible(page, check.selectors)
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
    }`,
  ],
  [
    '      const action = await clickOrFollowHref(page, found.locator)',
    "      const action = await clickOrFollowHref(page, found.locator)\n      await page.waitForURL((url) => url.toString().includes(check.expected), { timeout: 7000 }).catch(() => {})",
  ],
])

let source = readFileSync(sourcePath, 'utf8')
for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Current-canon audit wrapper could not find expected marker contract: ${before}`)
  }
  source = source.replaceAll(before, after)
}

writeFileSync(generatedPath, source)
try {
  const result = spawnSync(process.execPath, [generatedPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  process.exitCode = result.status ?? 1
} finally {
  rmSync(generatedPath, { force: true })
}
