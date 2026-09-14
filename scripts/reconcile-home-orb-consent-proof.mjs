import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { assertExactHomeOrbOpenTransportFailure } from './lib/home-orb-reconciliation-signature.mjs'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
const ownerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const expectedConsentLabel = 'Allow this message and bounded recent context to be processed by OpenAI.'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function settleAnimationFrames(page, frameCount) {
  await page.evaluate((frames) => new Promise((resolve) => {
    let completed = 0
    const advance = () => {
      completed += 1
      if (completed >= frames) resolve()
      else window.requestAnimationFrame(advance)
    }
    window.requestAnimationFrame(advance)
  }), frameCount)
}

async function waitForHomeReady(page) {
  const owner = page.locator(ownerSelector)
  await owner.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true',
    ownerSelector,
    { timeout: 45_000 },
  )
  return owner
}

async function readVisualEvidence(page) {
  const canvasSelector = '.urai-asset-home-world canvas'
  await page.waitForFunction((selector) => {
    const canvas = document.querySelector(selector)
    if (!(canvas instanceof HTMLCanvasElement)) return false
    const bounds = canvas.getBoundingClientRect()
    return bounds.width > 0 && bounds.height > 0
  }, canvasSelector, { timeout: 45_000 })

  const bounds = await page.evaluate((selector) => {
    const canvas = document.querySelector(selector)
    if (!(canvas instanceof HTMLCanvasElement)) return null
    const rect = canvas.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }, canvasSelector)
  const viewport = page.viewportSize()
  assert(bounds && viewport, 'missing retained-canvas bounds')

  const clipX = Math.max(0, bounds.x)
  const clipY = Math.max(0, bounds.y)
  const visibleWidth = Math.max(0, Math.min(bounds.x + bounds.width, viewport.width) - clipX)
  const visibleHeight = Math.max(0, Math.min(bounds.y + bounds.height, viewport.height) - clipY)
  const viewportCoverage = visibleWidth * visibleHeight / Math.max(1, viewport.width * viewport.height)
  assert(visibleWidth >= 1 && visibleHeight >= 1, 'retained canvas is outside viewport')

  const png = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    timeout: 90_000,
    clip: { x: clipX, y: clipY, width: visibleWidth, height: visibleHeight },
  })
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`
  const sample = await page.evaluate(async ({ dataUrl }) => {
    const image = new Image()
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('retained canvas PNG could not be decoded'))
    })
    image.src = dataUrl
    await loaded
    const surface = document.createElement('canvas')
    surface.width = Math.max(1, image.naturalWidth)
    surface.height = Math.max(1, image.naturalHeight)
    const context = surface.getContext('2d', { willReadFrequently: true })
    if (!context) return { available: false, reason: 'missing-2d-sampler' }
    context.drawImage(image, 0, 0)
    const points = [
      [0.18, 0.2], [0.5, 0.2], [0.82, 0.2],
      [0.18, 0.5], [0.5, 0.5], [0.82, 0.5],
      [0.18, 0.8], [0.5, 0.8], [0.82, 0.8],
    ]
    const luminance = points.map(([xRatio, yRatio]) => {
      const x = Math.max(0, Math.min(surface.width - 3, Math.round(surface.width * xRatio) - 1))
      const y = Math.max(0, Math.min(surface.height - 3, Math.round(surface.height * yRatio) - 1))
      const pixels = context.getImageData(x, y, Math.min(3, surface.width), Math.min(3, surface.height)).data
      let total = 0
      let count = 0
      for (let index = 0; index < pixels.length; index += 4) {
        total += pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722
        count += 1
      }
      return Math.round(total / Math.max(1, count))
    })
    return {
      available: true,
      pngWidth: surface.width,
      pngHeight: surface.height,
      luminance,
      luminanceRange: Math.max(...luminance) - Math.min(...luminance),
      visibleSamples: luminance.filter((value) => value >= 8).length,
    }
  }, { dataUrl })

  return {
    ...sample,
    viewportCoverage,
    bounds: { width: bounds.width, height: bounds.height },
    canvasPngBytes: png.length,
  }
}

const failure = JSON.parse(await readFile(path.join(outputDir, 'runner-failure.json'), 'utf8'))
assertExactHomeOrbOpenTransportFailure({ failure, exactHead })

const reconciliation = {
  schemaVersion: 'urai-home-orb-open-reconciliation-2',
  exactHead,
  originalFailure: 'playwright-pointer-transport-timeout-after-visible-enabled-stable-semantic-orb-control',
  interactionAuthority: 'canonical semantic BUTTON HTMLElement.click -> URAI world Orb-open event -> single hydrated PersistentWorldCompanion owner -> keyboard consent -> enabled Send -> ordinary Send click',
  visualGate: {
    source: 'retained-canvas-png',
    minimumViewportCoverage: 0.82,
    minimumLuminanceRange: 12,
    minimumVisibleSamples: 3,
  },
  providerBoundaryRequests: [],
  pageErrors: [],
  passed: false,
}

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
const page = await context.newPage()
page.on('pageerror', (error) => reconciliation.pageErrors.push(String(error)))
await page.route('**/api/urai/orb/openai', async (route) => {
  const request = route.request()
  if (request.method() !== 'POST') return route.continue()
  let payload = {}
  try { payload = request.postDataJSON() || {} } catch {}
  reconciliation.providerBoundaryRequests.push({
    message: payload?.message ?? null,
    authorization: request.headers().authorization ? 'present' : 'absent',
  })
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'PROOF_UNEXPECTED_PROVIDER_REQUEST' }),
  })
})

try {
  await page.addInitScript(() => {
    window.__uraiObservedOrbStates = []
    window.__uraiObservedOrbFrames = []
    window.addEventListener('urai:orb-state', (event) => {
      const eventState = event?.detail?.state ?? 'unknown'
      window.__uraiObservedOrbStates.push(eventState)
      let frame = 0
      const sampleRenderedState = () => {
        const owner = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
        const renderedState = owner?.getAttribute('data-home-orb-state') ?? null
        const renderedClip = owner?.getAttribute('data-home-orb-clip') ?? null
        window.__uraiObservedOrbFrames.push({ eventState, renderedState, renderedClip, frame })
        if (eventState === 'speaking'
          && (renderedState !== 'speaking' || renderedClip !== 'orb-speaking')
          && frame < 180) {
          frame += 1
          window.requestAnimationFrame(sampleRenderedState)
        }
      }
      window.requestAnimationFrame(sampleRenderedState)
    })
  })

  const response = await page.goto(`${base}/home/?homeAssetReview=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  assert(response?.status() === 200, `Home returned ${response?.status() ?? 'no response'}`)
  const owner = await waitForHomeReady(page)

  const openOrb = page.getByRole('button', { name: 'Open URAI Orb companion' }).first()
  const companionOrb = page.locator('button[data-world-target="orb-controls"]').first()
  assert(await page.locator('button[data-testid="home-semantic-orb"]').count() === 1, 'canonical semantic Orb control is not unique')
  assert(await page.locator('button[data-world-target="orb-controls"]').count() === 1, 'canonical PersistentWorldCompanion Orb owner is not unique')
  assert(await openOrb.isVisible(), 'canonical semantic Orb control is not visible')
  assert(await openOrb.isEnabled(), 'canonical semantic Orb control is not enabled')
  assert(await companionOrb.isEnabled(), 'canonical PersistentWorldCompanion Orb owner is not hydrated')
  await openOrb.evaluate((node) => {
    if (!(node instanceof HTMLButtonElement)) throw new Error('canonical semantic Orb target is not a button')
    node.click()
  })
  await page.locator('#urai-world-companion-menu[aria-hidden="false"]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'attention', ownerSelector)

  const talk = page.locator('summary').filter({ hasText: 'Talk with Orb' }).first()
  await talk.click({ noWaitAfter: true })
  const message = page.getByLabel('Message for Orb').first()
  await message.focus()
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'listening', ownerSelector)
  reconciliation.listeningState = await owner.getAttribute('data-home-orb-state')
  reconciliation.listeningClip = await owner.getAttribute('data-home-orb-clip')

  const consent = page.getByLabel(expectedConsentLabel).first()
  assert(await consent.isVisible(), 'consent checkbox is not visible')
  assert(await consent.isEnabled(), 'consent checkbox is not enabled')
  assert(!(await consent.isChecked()), 'consent checkbox must begin unchecked')

  await consent.focus()
  await consent.press('Space')
  reconciliation.consentChecked = await consent.isChecked()
  assert(reconciliation.consentChecked, 'keyboard consent activation did not check the native control')

  await message.fill('Give me a short grounded reflection.')
  await message.focus()
  const send = page.getByRole('button', { name: 'Send' }).first()
  await send.waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction(() => {
    const candidate = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Send')
    return candidate instanceof HTMLButtonElement && !candidate.disabled
  }, null, { timeout: 20_000 })
  reconciliation.sendEnabled = await send.isEnabled()
  assert(reconciliation.sendEnabled, 'Send did not become enabled from consent state')

  await Promise.all([
    page.waitForFunction(() => window.__uraiObservedOrbFrames?.some((sample) => sample.eventState === 'speaking'
      && sample.renderedState === 'speaking'
      && sample.renderedClip === 'orb-speaking'), null, { timeout: 20_000 }),
    send.click({ noWaitAfter: true }),
  ])

  const respondingSample = await page.evaluate(() => window.__uraiObservedOrbFrames?.find((sample) => sample.eventState === 'speaking'
    && sample.renderedState === 'speaking'
    && sample.renderedClip === 'orb-speaking') ?? null)
  reconciliation.respondingState = respondingSample?.renderedState ?? null
  reconciliation.respondingClip = respondingSample?.renderedClip ?? null

  const responsePanel = page.locator('section[aria-label="Orb response"]')
  await responsePanel.waitFor({ state: 'visible', timeout: 20_000 })
  reconciliation.responseText = (await responsePanel.textContent()) || ''
  reconciliation.observedStates = await page.evaluate(() => window.__uraiObservedOrbStates || [])
  reconciliation.lifecyclePassed = ['attention', 'listening', 'thinking', 'speaking'].every((state) => reconciliation.observedStates.includes(state))

  await consent.focus()
  await consent.press('Space')
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'privacy', ownerSelector, { timeout: 20_000 })
  reconciliation.privacyState = await owner.getAttribute('data-home-orb-state')
  reconciliation.privacyClip = await owner.getAttribute('data-home-orb-clip')
  reconciliation.consentUnchecked = !(await consent.isChecked())

  reconciliation.visual = await readVisualEvidence(page)
  reconciliation.screenshot = `orb-lifecycle-production-ui-reconciled-${exactHead.slice(0, 12)}.png`
  const screenshot = await page.screenshot({
    path: path.join(outputDir, reconciliation.screenshot),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
    timeout: 90_000,
  })
  reconciliation.screenshotBytes = screenshot.length
  reconciliation.screenshotSha256 = createHash('sha256').update(screenshot).digest('hex')

  await page.keyboard.press('Escape')
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'idle', ownerSelector, { timeout: 20_000 })
  reconciliation.closedState = await owner.getAttribute('data-home-orb-state')
  reconciliation.closedClip = await owner.getAttribute('data-home-orb-clip')

  reconciliation.passed = reconciliation.listeningState === 'listening'
    && reconciliation.listeningClip === 'orb-listening'
    && reconciliation.consentChecked === true
    && reconciliation.sendEnabled === true
    && reconciliation.respondingState === 'speaking'
    && reconciliation.respondingClip === 'orb-speaking'
    && reconciliation.privacyState === 'privacy'
    && reconciliation.privacyClip === 'orb-privacy'
    && reconciliation.consentUnchecked === true
    && reconciliation.closedState === 'idle'
    && reconciliation.closedClip === 'orb-breathe'
    && reconciliation.lifecyclePassed === true
    && reconciliation.providerBoundaryRequests.length === 0
    && reconciliation.responseText.includes('Deterministic local fallback — no external AI provider processed this message.')
    && reconciliation.visual?.available === true
    && reconciliation.visual.viewportCoverage >= reconciliation.visualGate.minimumViewportCoverage
    && reconciliation.visual.luminanceRange >= reconciliation.visualGate.minimumLuminanceRange
    && reconciliation.visual.visibleSamples >= reconciliation.visualGate.minimumVisibleSamples
    && reconciliation.screenshotBytes > 12_000
    && reconciliation.pageErrors.length === 0

  assert(reconciliation.passed, `Home Orb consent reconciliation did not satisfy the full lifecycle contract: ${JSON.stringify(reconciliation)}`)
  reconciliation.completedAt = new Date().toISOString()
  await writeFile(path.join(outputDir, 'orb-consent-reconciliation.json'), `${JSON.stringify(reconciliation, null, 2)}\n`)
  console.log('HOME_ORB_CONSENT_RECONCILIATION_PASSED')
} catch (error) {
  reconciliation.error = String(error)
  reconciliation.completedAt = new Date().toISOString()
  await writeFile(path.join(outputDir, 'orb-consent-reconciliation.json'), `${JSON.stringify(reconciliation, null, 2)}\n`)
  throw error
} finally {
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
}
