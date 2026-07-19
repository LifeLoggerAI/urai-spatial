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
  ["markers: ['Life Map', 'Wheel', 'Drag', 'memory star']", "markers: ['URAI destination life-map.', 'World layer infrastructure-world.']"],
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
    `    if (check.name === 'life-map-to-focus') {
      const controls = page.locator('details.life-map-accessibility-menu').first()
      await controls.waitFor({ state: 'visible', timeout: 10000 })
      if ((await controls.getAttribute('open')) === null) {
        await controls.locator('summary').click({ timeout: 10000 })
      }
      const memory = controls.getByRole('button', { name: /The Quiet Reset/i }).first()
      await memory.click({ timeout: 10000 })
      await page.waitForTimeout(700)

      const selectedPortal = page.locator('.life-map-memory-portals').first()
      await selectedPortal.waitFor({ state: 'visible', timeout: 10000 })
      const selectedSurface = await selectedPortal.evaluate((node) => {
        const rect = node.getBoundingClientRect()
        const focus = node.querySelector('button')?.getBoundingClientRect()
        const semanticList = document.querySelector("details.life-map-accessibility-menu [data-life-map-overview-list='true']")
        const semanticStyle = semanticList ? getComputedStyle(semanticList) : null
        const semanticRect = semanticList?.getBoundingClientRect()
        const semanticListVisible = Boolean(semanticStyle && semanticRect
          && semanticStyle.display !== 'none'
          && semanticStyle.visibility !== 'hidden'
          && Number.parseFloat(semanticStyle.opacity || '1') > 0.02
          && semanticRect.width > 4
          && semanticRect.height > 4)
        return {
          contained: rect.left >= -1 && rect.right <= window.innerWidth + 1,
          focusTouchTarget: Boolean(focus && focus.width >= 44 && focus.height >= 44),
          semanticListHidden: !semanticListVisible,
        }
      })
      if (!selectedSurface.contained || !selectedSurface.focusTouchTarget || !selectedSurface.semanticListHidden) {
        throw new Error('Selected Life Map surface failed containment, touch-target, or semantic-list ownership proof')
      }
    }

    let found = await firstVisible(page, check.selectors)
    if (!found) {
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
