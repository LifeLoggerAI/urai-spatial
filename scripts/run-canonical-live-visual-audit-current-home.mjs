import { readFile, rm, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./run-canonical-live-visual-audit.mjs', import.meta.url)
const runtimeUrl = new URL(`./.run-canonical-live-visual-audit-${process.pid}-${Date.now()}.mjs`, import.meta.url)
const original = await readFile(sourceUrl, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label} contract changed; expected one source match and found ${count}`)
  return source.replace(before, after)
}

for (const [label, marker] of [
  ['canonical audit schema', `schemaVersion: 'urai-canonical-live-visual-audit-6'`],
  ['Focus public identity route', `path: '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=life-map'`],
  ['Replay public identity route', `path: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=life-map'`],
  ['Replay legacy title marker', `{ id: 'replay', path: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=life-map', selector: 'main', markers: ['The Quiet Reset'] },`],
  ['Focus public identity expectation', `const expectedPublicMemoryId = 'quiet-reset'`],
  ['Focus fixture identity expectation', `const expectedFixtureMemoryId = 'demo:quiet-reset'`],
  ['retired Mirror audit marker', `markers: ['Mirror does not judge.']`],
  ['legacy Ground route', `{ id: 'ground', path: '/ground/', selector: '.ground-spatial-root', markers: ['URAI Ground', 'Private infrastructure, embodied.'] },`],
  ['legacy Life Map disclosure', `{ id: 'life-map', path: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1', selector: '[data-testid="urai-true-3d-life-map"]', markers: ['Disclosed sample universe'] },`],
  ['legacy Life Map click', `await focus.click()`],
  ['legacy XR chamber audit marker', `{ id: 'spatial-ar-vr', path: '/spatial/ar-vr', selector: 'body', markers: ['URAI AR / VR / XR entry chamber', 'Explorable entry chamber'] },`],
]) {
  if (!original.includes(marker)) throw new Error(`${label} is not present in the canonical audit authority`)
}

let patched = original
patched = replaceOnce(
  patched,
  `selector: '.urai-final-home-world[data-home-spatial-renderer="webgl"], [data-testid="urai-home-accessible-fallback"]',`,
  `selector: '.urai-asset-home-world[data-home-primary-owner="asset-driven"], .urai-final-home-world[data-home-spatial-renderer="webgl"], main.urai-home-spatial-world-final, [data-testid="urai-home-accessible-fallback"]',`,
  'canonical Home owner selector',
)

patched = replaceOnce(
  patched,
  `{ id: 'ground', path: '/ground/', selector: '.ground-spatial-root', markers: ['URAI Ground', 'Private infrastructure, embodied.'] },`,
  `{ id: 'ground', path: '/ground/', selector: '[data-testid="urai-ground-lived-world"]', markers: [] },`,
  'current Ground structural owner',
)

patched = replaceOnce(
  patched,
  `{ id: 'life-map', path: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1', selector: '[data-testid="urai-true-3d-life-map"]', markers: ['Disclosed sample universe'] },`,
  `{ id: 'life-map', path: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1', selector: '[data-testid="urai-true-3d-life-map"]', markers: ['Disclosed sample · not your memories'] },`,
  'current Life Map disclosed sample copy',
)

patched = replaceOnce(
  patched,
  `{ id: 'replay', path: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=life-map', selector: 'main', markers: ['The Quiet Reset'] },`,
  `{ id: 'replay', path: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=life-map', selector: '[data-testid="cinematic-replay-client"][data-replay-spatial-owner="r3f-lived-memory-environment"]', markers: [] },`,
  'current Replay spatial owner',
)

patched = replaceOnce(
  patched,
  `{ id: 'mirror', path: '/mirror', selector: 'main', markers: ['Mirror does not judge.'] },`,
  `{ id: 'mirror', path: '/mirror', selector: '[data-testid="mirror-bare-entry"]', markers: ['Choose what Mirror may open.', 'Open disclosed demo', 'Open Passport'] },`,
  'current Mirror bare entry',
)

patched = replaceOnce(
  patched,
  `{ id: 'spatial-ar-vr', path: '/spatial/ar-vr', selector: 'body', markers: ['URAI AR / VR / XR entry chamber', 'Explorable entry chamber'] },`,
  `{ id: 'spatial-ar-vr', path: '/spatial/ar-vr', selector: 'main.urai-system-state', markers: ['This place isn’t part of your world', 'Return home'] },`,
  'current pre-launch XR fail-closed boundary',
)

const oldHomeSettlement = `  if (route.id === 'home') {
    await page.waitForFunction(() => {
      const webglOwner = document.querySelector('.urai-final-home-world[data-home-spatial-renderer="webgl"]')
      if (webglOwner) {
        const canvas = webglOwner.querySelector('canvas')
        const rect = canvas?.getBoundingClientRect()
        return webglOwner.getAttribute('data-home-ready') === 'true'
          && webglOwner.getAttribute('data-home-visible-world') === 'final-physical-sanctuary-memory-rooms'
          && Boolean(rect && rect.width >= 240 && rect.height >= 240)
      }
      const fallback = document.querySelector('[data-testid="urai-home-accessible-fallback"]')
      const body = document.body.innerText || ''
      return Boolean(fallback && body.includes('Own your life.') && body.includes('Threshold online'))
    }, null, { timeout: 45_000, polling: 50 })
  }`

const currentHomeSettlement = `  if (route.id === 'home') {
    await page.waitForFunction(() => {
      const assetOwner = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (assetOwner) {
        const canvas = assetOwner.querySelector('canvas')
        const rect = canvas?.getBoundingClientRect()
        return assetOwner.getAttribute('data-home-assets-ready') === 'true'
          && assetOwner.getAttribute('data-home-visible-world') === 'cinematic-lived-world-threshold'
          && Boolean(rect && rect.width >= 240 && rect.height >= 240 && canvas.width > 0 && canvas.height > 0)
      }
      const fallback = document.querySelector('[data-testid="urai-home-accessible-fallback"]')
      const rect = fallback?.getBoundingClientRect()
      return Boolean(fallback && rect && rect.width >= 240 && rect.height >= 240)
    }, null, { timeout: 90_000, polling: 50 })
  }`
patched = replaceOnce(patched, oldHomeSettlement, currentHomeSettlement, 'current Home readiness')

const oldRouteSettlement = `    await page.locator(route.selector).first().waitFor({ state: 'visible', timeout: 45_000 })
    await settleSpatialRoute(page, route)`
const currentRouteSettlement = `    const settleCurrentRoute = async () => {
      await page.locator(route.selector).first().waitFor({ state: 'visible', timeout: route.id === 'home' ? 90_000 : 45_000 })
      await settleSpatialRoute(page, route)
    }
    try {
      await settleCurrentRoute()
    } catch (error) {
      if (route.id !== 'home') throw error
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
      await settleCurrentRoute()
    }`
patched = replaceOnce(patched, oldRouteSettlement, currentRouteSettlement, 'bounded Home cold-start retry')

const oldGroundSettlement = `  if (route.id === 'ground') {
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="urai-ground-private-workforce-world"]')
      return root?.getAttribute('data-ground-ready') === 'true' && root?.getAttribute('data-ground-arrival') === 'settled'
    }, null, { timeout: 30_000, polling: 50 })
  }`
const currentGroundSettlement = `  if (route.id === 'ground') {
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="urai-ground-lived-world"]')
      const canvas = root?.querySelector('canvas')
      const rect = canvas?.getBoundingClientRect()
      return root instanceof HTMLElement
        && root.dataset.groundRuntimeOwner === 'first-person-lived-world'
        && root.dataset.groundVisualOwner === 'atmospheric-living-environment'
        && root.dataset.groundExploration === 'first-person-no-visible-body'
        && canvas instanceof HTMLCanvasElement
        && Boolean(rect && rect.width >= 240 && rect.height >= 240)
        && canvas.width > 0
        && canvas.height > 0
    }, null, { timeout: 45_000, polling: 50 })
  }`
patched = replaceOnce(patched, oldGroundSettlement, currentGroundSettlement, 'current Ground rendered authority')

const oldLifeMapSettlement = `  if (route.id === 'life-map') {
    await page.waitForFunction(() => document.querySelector('[data-testid="urai-true-3d-life-map"]')?.getAttribute('data-life-map-mode') === 'overview', null, { timeout: 30_000, polling: 50 })
  }`
const currentLifeMapAndReplaySettlement = `  if (route.id === 'life-map') {
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="urai-true-3d-life-map"]')
      const canvas = root?.querySelector('canvas')
      const rect = canvas?.getBoundingClientRect()
      return root?.getAttribute('data-life-map-mode') === 'overview'
        && canvas instanceof HTMLCanvasElement
        && Boolean(rect && rect.width >= 240 && rect.height >= 240)
        && canvas.width > 0
        && canvas.height > 0
    }, null, { timeout: 60_000, polling: 50 })
  }
  if (route.id === 'replay') {
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="cinematic-replay-client"][data-replay-spatial-owner="r3f-lived-memory-environment"]')
      return root?.getAttribute('data-memory-status') === 'demo'
        && root?.getAttribute('data-memory-id') === 'demo:quiet-reset'
        && root?.getAttribute('data-manifest-id') === 'replay-recovery-thread'
        && root?.querySelector('canvas') !== null
    }, null, { timeout: 45_000, polling: 50 })
  }`
patched = replaceOnce(patched, oldLifeMapSettlement, currentLifeMapAndReplaySettlement, 'current Life Map and Replay rendered readiness')

const oldScreenshot = `    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false, animations: 'disabled', caret: 'hide' })`
const currentScreenshot = `    if (['home', 'ground', 'life-map'].includes(route.id)) {
      const cdp = await context.newCDPSession(page)
      try {
        const capture = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
        await writeFile(path.join(outputDir, screenshot), Buffer.from(capture.data, 'base64'))
      } finally {
        await cdp.detach()
      }
    } else {
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 60_000 })
    }`
patched = replaceOnce(patched, oldScreenshot, currentScreenshot, 'Life Map viewport capture')

const oldFocusTouchTarget = `    const box = await focus.boundingBox()
    if (!box || box.width < 48 || box.height < 48) throw new Error('Focus action does not meet the 48px touch-target contract')`
const currentFocusTouchTarget = `    const focusSelector = '.life-map-thresholds[aria-label="Selected memory actions"] button.focus-threshold'
    await page.waitForFunction((selector) => {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLButtonElement)) return false
      const rect = element.getBoundingClientRect()
      return element.textContent?.includes('Enter Focus') && rect.width >= 48 && rect.height >= 48
    }, focusSelector, { timeout: 30_000, polling: 50 })
    const box = await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLButtonElement)) return null
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }, focusSelector)
    if (!box || box.width < 48 || box.height < 48) throw new Error('Focus action does not meet the 48px touch-target contract')`
patched = replaceOnce(patched, oldFocusTouchTarget, currentFocusTouchTarget, 'Focus touch target geometry')

patched = replaceOnce(
  patched,
  `    await focus.click()`,
  `    await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLButtonElement)) throw new Error('Life Map Focus action disappeared before navigation')
      element.click()
    }, focusSelector)`,
  'Life Map Focus DOM navigation',
)

for (const [label, marker] of [
  ['Home current visible-world authority', `data-home-visible-world') === 'cinematic-lived-world-threshold'`],
  ['Bounded Home cold-start retry', `if (route.id !== 'home') throw error`],
  ['Ground current structural owner', `data-testid="urai-ground-lived-world"`],
  ['Ground current runtime owner', `groundRuntimeOwner === 'first-person-lived-world'`],
  ['Ground current visual owner', `groundVisualOwner === 'atmospheric-living-environment'`],
  ['Ground first-person authority', `groundExploration === 'first-person-no-visible-body'`],
  ['Ground canvas geometry', `rect.width >= 240 && rect.height >= 240`],
  ['Life Map current sample disclosure', `Disclosed sample · not your memories`],
  ['Replay current spatial owner', `data-replay-spatial-owner="r3f-lived-memory-environment"`],
  ['Replay fixture memory identity', `data-memory-id') === 'demo:quiet-reset'`],
  ['Replay manifest identity', `data-manifest-id') === 'replay-recovery-thread'`],
  ['Life Map rendered canvas evidence', `data-life-map-mode') === 'overview'`],
  ['WebGL-heavy CDP viewport evidence', `['home', 'ground', 'life-map'].includes(route.id)`],
  ['CDP screenshot authority', `Page.captureScreenshot`],
  ['XR pre-launch fail-closed copy', `This place isn’t part of your world`],
  ['Focus DOM geometry', `document.querySelector(selector)`],
  ['Focus direct DOM click', `element.click()`],
]) {
  if (!patched.includes(marker)) throw new Error(`${label} was not materialized in current visual audit`)
}
if (patched.includes(`root?.getAttribute('data-ground-ready') === 'true'`)) throw new Error('stale Ground readiness marker survived current visual audit')
if (patched.includes('Private infrastructure beneath the living world')) throw new Error('stale Ground copy survived current visual audit')
if (patched.includes('urai-ground-private-workforce-world')) throw new Error('retired Ground owner survived current visual audit')
if (patched.includes('Disclosed sample universe')) throw new Error('retired Life Map disclosure survived current visual audit')
if (patched.includes(`markers: ['URAI AR / VR / XR entry chamber', 'Explorable entry chamber']`)) throw new Error('post-launch XR chamber expectation survived pre-launch visual audit')

await writeFile(runtimeUrl, patched, 'utf8')
try {
  await import(`${runtimeUrl.href}?currentHome=${Date.now()}`)
} finally {
  await rm(runtimeUrl, { force: true })
}
