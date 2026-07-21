import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(scriptDir, 'live-visual-audit.mjs')
const generatedPath = join(scriptDir, `.live-visual-audit-current-${process.pid}.mjs`)
const demoMemoryQuery = 'memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

let source = readFileSync(sourcePath, 'utf8')

function replaceRequired(pattern, replacement, label) {
  const next = source.replace(pattern, replacement)
  if (next === source) throw new Error(`Current-canon audit wrapper could not replace ${label}`)
  source = next
}

replaceRequired(
  /import \{ chromium \} from 'playwright'/,
  `import { createRequire } from 'node:module'
const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')`,
  'Tier-1 Playwright ownership',
)
replaceRequired(
  /markers:\s*\['Own your life',\s*'Step inside yourself'\]/g,
  "markers: ['WALK THE SANCTUARY', 'URAI destination home. World layer living-world.']",
  'Home marker contract',
)
replaceRequired(
  /markers:\s*\['Your real life has a place',\s*'private operating world'\]/g,
  "markers: ['URAI Ground', 'Private infrastructure, embodied.', 'Reception', 'Archive']",
  'Ground marker contract',
)
replaceRequired(
  /markers:\s*\['Life Map',\s*'Wheel',\s*'Drag',\s*'memory star'\]/g,
  "markers: ['Step inside the map.', 'Life Map independent memory universe', 'Map controls']",
  'Life Map marker contract',
)
replaceRequired(
  /route:\s*'\/focus\?memoryId=quiet-reset',/g,
  `route: '/focus?${demoMemoryQuery}',`,
  'Focus route identity',
)
replaceRequired(
  /markers:\s*\['The Quiet Reset',\s*'Selected memory camera chamber',\s*'Replay'\]/g,
  "markers: ['The Quiet Reset', 'Selected memory', 'Enter Replay']",
  'Focus marker contract',
)
replaceRequired(
  /route:\s*'\/replay\?memoryId=quiet-reset&manifestId=replay-recovery-thread',/g,
  `route: '/replay?${demoMemoryQuery}',`,
  'Replay route identity',
)
replaceRequired(
  /markers:\s*\['Replay the thread',\s*'Film beats'\]/g,
  "markers: ['The Quiet Reset', 'Memory', 'Play']",
  'Replay marker contract',
)
replaceRequired(
  /markers:\s*\['See the pattern clearly',\s*'Reflection stack',\s*'Mirror'\]/g,
  "markers: ['Mirror does not judge.', 'Patterns become visible without turning your life into a score.']",
  'Mirror marker contract',
)
replaceRequired(
  /markers:\s*\['Your life stays yours',\s*'Vault layers',\s*'Passport'\]/g,
  "markers: ['Your life remains yours.', 'OWNERSHIP VAULT']",
  'Passport marker contract',
)
replaceRequired(
  /markers:\s*\['World online',\s*'Route matrix',\s*'Tracked'\]/g,
  "markers: ['Launch locked. Proof before expansion.', 'Tracked', 'Production fingerprint is read only on urai.app.', 'AUTHORITY UNRESOLVED']",
  'Status marker contract',
)
replaceRequired(
  /markers:\s*\['Choose what the world can hold',\s*'Privacy Controls',\s*'Private by default'\]/g,
  "markers: ['Nothing moves without you.', 'Consent remains reversible']",
  'Privacy marker contract',
)
replaceRequired(
  /markers:\s*\['Emotional weather over private places',\s*'symbolic atlas'\]/g,
  "markers: ['Places carry signal.', 'EMOTIONAL WEATHER']",
  'Location marker contract',
)
replaceRequired(
  /markers:\s*\['Step inside the Life Map',\s*'Quest',\s*'manual'\]/g,
  "markers: ['Explorable entry chamber', 'Enter VR in Quest', 'Desktop and mobile']",
  'XR marker contract',
)
replaceRequired(
  /markers:\s*\['URAI'\]/g,
  "markers: ['Your life is a world.', 'Demo fixture', 'Play the proof rail']",
  'Demo marker contract',
)
replaceRequired(
  /markers:\s*\['Replay'\]/g,
  "markers: ['Your life is a world.', 'Demo fixture', 'Play the proof rail']",
  'Demo replay-film marker contract',
)

replaceRequired(
  /'a\[data-urai-audit-action="home-life-map"\]',/g,
  "'button[aria-label=\"Open Life Map directly\"]',\n      'button[data-world-target=\"life-map\"]',\n      'a[data-urai-audit-action=\"home-life-map\"]',",
  'Home to Life Map selector ownership',
)
replaceRequired(
  /'a\[data-urai-audit-action="home-ground"\]',/g,
  "'button[aria-label=\"Open Ground directly\"]',\n      'button[data-world-target=\"infrastructure-hub\"]',\n      'a[data-urai-audit-action=\"home-ground\"]',",
  'Home to Ground selector ownership',
)
replaceRequired(
  /'a\[data-urai-audit-action="life-map-focus"\]',/g,
  "'button[data-world-target=\"focus\"]',\n      '.life-map-memory-portals button',\n      'a[data-urai-audit-action=\"life-map-focus\"]',",
  'Life Map to Focus selector ownership',
)
replaceRequired(
  /start:\s*'\/life-map',/g,
  "start: '/life-map?demo=1',",
  'Life Map explicit-demo interaction start',
)
replaceRequired(
  /start:\s*'\/focus\?memoryId=quiet-reset',/g,
  `start: '/focus?${demoMemoryQuery}',`,
  'Focus interaction identity',
)

replaceRequired(
  /    const found = await firstVisible\(page, check\.selectors\)\n    if \(!found\) \{[\s\S]*?\n    \} else \{/,
  `    if (check.name === 'life-map-to-focus') {
      await page.evaluate(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
      await page.reload({ waitUntil: 'domcontentloaded' })

      const controls = page.locator('.life-map-accessibility-menu').first()
      await controls.waitFor({ state: 'visible', timeout: 15000 })
      if ((await controls.getAttribute('open')) === null) {
        await controls.locator('summary').click({ timeout: 10000 })
      }

      const memory = controls.getByRole('button', { name: /The Quiet Reset/i }).first()
      await memory.waitFor({ state: 'visible', timeout: 15000 })
      await memory.click({ timeout: 10000 })

      const stableProof = await page.waitForFunction(() => {
        const proofKey = '__uraiLifeMapSelectedStableProof'
        const node = document.querySelector('.life-map-memory-portals')
        const focus = node?.querySelector('button[data-world-target="focus"], button')
        if (!(node instanceof HTMLElement) || !(focus instanceof HTMLElement)) {
          window[proofKey] = { frames: 0, signature: '' }
          return false
        }
        const rect = node.getBoundingClientRect()
        const focusRect = focus.getBoundingClientRect()
        const semanticList = document.querySelector(".life-map-accessibility-menu [data-life-map-overview-list='true']")
        const semanticStyle = semanticList ? getComputedStyle(semanticList) : null
        const semanticRect = semanticList?.getBoundingClientRect()
        const semanticListVisible = Boolean(semanticStyle && semanticRect
          && semanticStyle.display !== 'none'
          && semanticStyle.visibility !== 'hidden'
          && Number.parseFloat(semanticStyle.opacity || '1') > 0.02
          && semanticRect.width > 4
          && semanticRect.height > 4)
        const owner = document.elementFromPoint(
          focusRect.left + focusRect.width / 2,
          focusRect.top + focusRect.height / 2,
        )
        const result = {
          contained: rect.left >= -1 && rect.right <= window.innerWidth + 1
            && rect.top >= -1 && rect.bottom <= window.innerHeight + 1,
          focusTouchTarget: focusRect.width >= 44 && focusRect.height >= 44,
          semanticListHidden: !semanticListVisible,
          pointerOwned: Boolean(owner && focus.contains(owner)),
        }
        const valid = result.contained && result.focusTouchTarget && result.semanticListHidden && result.pointerOwned
        const signature = [
          Math.round(rect.left), Math.round(rect.top), Math.round(rect.right), Math.round(rect.bottom),
          Math.round(focusRect.left), Math.round(focusRect.top), Math.round(focusRect.width), Math.round(focusRect.height),
        ].join(':')
        const previous = window[proofKey] || { frames: 0, signature: '' }
        const frames = valid && previous.signature === signature ? previous.frames + 1 : valid ? 1 : 0
        window[proofKey] = { frames, signature }
        return frames >= 4 ? result : false
      }, null, { timeout: 15000, polling: 'raf' })

      const selectedSurface = await stableProof.jsonValue()
      if (!selectedSurface?.contained || !selectedSurface?.focusTouchTarget || !selectedSurface?.semanticListHidden || !selectedSurface?.pointerOwned) {
        throw new Error('Selected Life Map surface failed multi-frame containment, touch-target, semantic-list, or pointer-ownership proof: ' + JSON.stringify(selectedSurface))
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
    }
    if (!found) {
      error = \`visible selector not found: \${check.selectors.join(' | ')}\`
    } else {`,
  'interaction selection block',
)
replaceRequired(
  /      const action = await clickOrFollowHref\(page, found\.locator\)\n      mode = action\.mode/,
  `      let action
      if (check.name === 'life-map-to-focus') {
        await found.locator.evaluate((element) => element.click())
        await page.waitForTimeout(300)
        action = { mode: 'dom-activation-after-pointer-proof', error: '' }
      } else {
        action = await clickOrFollowHref(page, found.locator)
      }
      await page.waitForURL((url) => url.toString().includes(check.expected), { timeout: 7000 }).catch(() => {})
      if (check.name === 'life-map-to-focus') {
        await page.waitForFunction(() => {
          const chamber = document.querySelector('[data-testid="urai-final-focus-chamber"]')
          return chamber instanceof HTMLElement
            && chamber.getAttribute('data-memory-status') === 'demo'
            && chamber.getAttribute('data-memory-id')?.startsWith('demo:')
            && !document.body.textContent?.includes('Memory unavailable')
        }, null, { timeout: 15000, polling: 'raf' })
        const destinationUrl = new URL(page.url())
        if (destinationUrl.searchParams.get('demo') !== '1'
          || !destinationUrl.searchParams.get('memoryId')?.startsWith('demo:')) {
          throw new Error('Life Map did not preserve truthful explicit-demo identity into Focus: ' + destinationUrl.toString())
        }
      }
      mode = action.mode`,
  'interaction URL wait, Focus identity proof, and stable portal activation',
)

const forbidden = [
  "markers: ['Own your life', 'Step inside yourself']",
  "markers: ['URAI']",
  "markers: ['Replay']",
  "start: '/life-map',",
  'await page.waitForTimeout(700)',
  "'Pending proof'",
]
for (const value of forbidden) {
  if (source.includes(value)) throw new Error(`Current-canon audit still contains retired contract: ${value}`)
}
for (const value of [
  'WALK THE SANCTUARY',
  'Open Ground directly',
  'Open Life Map directly',
  '.life-map-memory-portals',
  "start: '/life-map?demo=1',",
  'urai:lifeMapDemoMode',
  '.life-map-accessibility-menu',
  'dom-activation-after-pointer-proof',
  "getAttribute('data-memory-status')",
  "getAttribute('data-memory-id')",
  "destinationUrl.searchParams.get('demo')",
  "startsWith('demo:')",
  'Your life is a world.',
  'Demo fixture',
  'Enter Replay',
  "polling: 'raf'",
  "requireFromTierOne('playwright')",
  'Production fingerprint is read only on urai.app.',
  'AUTHORITY UNRESOLVED',
  '__uraiLifeMapSelectedStableProof',
  'frames >= 4',
]) {
  if (!source.includes(value)) throw new Error(`Current-canon audit is missing required contract: ${value}`)
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
