import { createHash } from 'node:crypto'
import { mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-ground-canon-proof')
const videoDir = path.join(outputDir, 'video')
await mkdir(outputDir, { recursive: true })
await mkdir(videoDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-home-ground-canon-proof-1',
  exactHead,
  capturedAt: new Date().toISOString(),
  canonicalJourney: 'HOME -> PHYSICAL GROUND -> GROUND DESCENT -> FIRST PERSON -> EXPLORATION -> UNWIND -> HOME',
  screenshots: [],
  motion: [],
  assertions: [],
  errors: [],
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function normalizedPathname(url) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

async function settleFrames(page, count = 18) {
  await page.evaluate((frames) => new Promise((resolve) => {
    let seen = 0
    const tick = () => { if (++seen >= frames) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

async function waitForHome(page) {
  const home = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  await home.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction(() => {
    const owner = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    return owner?.getAttribute('data-home-assets-ready') === 'true'
      && owner?.getAttribute('data-home-ready') === 'true'
      && owner?.getAttribute('data-home-interaction-ready') === 'true'
  }, null, { timeout: 45_000 })
  return home
}

async function waitForGround(page) {
  const ground = page.locator('.ground-spatial-root[data-ground-exploration="first-person"]').first()
  await ground.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction(() => {
    const owner = document.querySelector('.ground-spatial-root[data-ground-exploration="first-person"]')
    return owner?.getAttribute('data-ground-ready') === 'true'
      && owner?.getAttribute('data-ground-world-ready') === 'true'
      && owner?.getAttribute('data-ground-camera-ready') === 'true'
  }, null, { timeout: 45_000 })
  return ground
}

async function capture(page, id, selector = null, clip = null) {
  let buffer
  if (selector) {
    const target = page.locator(selector).first()
    await target.waitFor({ state: 'visible', timeout: 20_000 })
    buffer = await target.screenshot({ animations: 'disabled', caret: 'hide', timeout: 90_000 })
  } else {
    buffer = await page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: false, clip: clip ?? undefined, timeout: 90_000 })
  }
  const filename = `${id}-${exactHead.slice(0, 12)}.png`
  await writeFile(path.join(outputDir, filename), buffer)
  const home = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  const ground = page.locator('.ground-spatial-root[data-ground-exploration="first-person"]').first()
  const record = {
    id,
    filename,
    bytes: buffer.length,
    sha256: sha256(buffer),
    pathname: normalizedPathname(page.url()),
    homePhase: await home.getAttribute('data-home-scene-phase').catch(() => null),
    homeCamera: await home.getAttribute('data-home-camera-mode').catch(() => null),
    homeProgress: await home.getAttribute('data-home-transition-progress').catch(() => null),
    groundCamera: await ground.getAttribute('data-ground-camera-mode').catch(() => null),
    groundUnwind: await ground.getAttribute('data-ground-unwind').catch(() => null),
    groundOrb: await ground.getAttribute('data-ground-orb').catch(() => null),
    passed: buffer.length > 12_000,
  }
  receipt.screenshots.push(record)
  if (!record.passed) receipt.errors.push({ id, error: `retained frame too small (${buffer.length} bytes)` })
  return record
}

function assertReceipt(id, condition, detail) {
  receipt.assertions.push({ id, passed: Boolean(condition), detail })
  if (!condition) receipt.errors.push({ id, error: detail })
}

async function closeAndRecord(context, page, id) {
  const video = page.video()
  await context.close()
  if (!video) return
  const original = await video.path().catch(() => null)
  if (!original) return
  const target = path.join(videoDir, `${id}-${exactHead.slice(0, 12)}.webm`)
  await rename(original, target).catch(() => {})
  const info = await stat(target).catch(() => null)
  if (info) receipt.motion.push({ id, filename: path.relative(outputDir, target), bytes: info.size, passed: info.size > 20_000 })
}

async function runDesktopJourney(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(message.text()) })

  await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const home = await waitForHome(page)
  await settleFrames(page, 40)
  await capture(page, 'home-ground-shot-01-home-establishing')

  const box = await home.locator('canvas').boundingBox()
  if (!box) throw new Error('Home canvas has no bounds')
  const x = box.x + box.width * .50
  const y = box.y + box.height * .84
  await page.mouse.move(x, y)
  await page.waitForTimeout(220)
  await capture(page, 'home-ground-shot-02-ground-selection-intent')

  await page.mouse.click(x, y)
  await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-scene-phase') === 'GROUND_DESCENT', null, { timeout: 5_000, polling: 20 })
  await page.waitForTimeout(250)
  await capture(page, 'home-ground-shot-03-early-descent')
  await page.waitForTimeout(620)
  await capture(page, 'home-ground-shot-04-mid-descent')

  await page.waitForURL((url) => normalizedPathname(url.toString()) === '/ground', { timeout: 10_000 })
  const ground = await waitForGround(page)
  await settleFrames(page, 18)
  await capture(page, 'home-ground-shot-05-first-person-takeover')
  await page.waitForTimeout(300)
  await capture(page, 'home-ground-shot-06-ground-establishing')

  const eyeHeight = Number(await ground.getAttribute('data-ground-eye-height'))
  const speed = Number(await ground.getAttribute('data-ground-walk-speed'))
  assertReceipt('ground-eye-height', Math.abs(eyeHeight - 1.70) < .001, `Ground eye height=${eyeHeight}`)
  assertReceipt('ground-walk-speed', Math.abs(speed - 1.85) < .001, `Ground walk speed=${speed}`)
  assertReceipt('ground-no-pointer-lock', await page.evaluate(() => document.pointerLockElement === null), 'pointerLockElement must remain null')
  assertReceipt('ground-collision-contract', await ground.getAttribute('data-ground-collision') === 'terrain-slope-step-and-authored-obstacles', `collision=${await ground.getAttribute('data-ground-collision')}`)
  assertReceipt('ground-boundary-contract', await ground.getAttribute('data-ground-boundary') === 'terrain-rise-scanned-geology-before-safety-clamp', `boundary=${await ground.getAttribute('data-ground-boundary')}`)
  assertReceipt('ground-readiness-barrier', (await ground.getAttribute('data-ground-world-ready')) === 'true' && (await ground.getAttribute('data-ground-camera-ready')) === 'true', 'camera and physical world must both be ready')

  await page.keyboard.down('w')
  await page.waitForTimeout(2200)
  await page.keyboard.up('w')
  await settleFrames(page, 12)
  await capture(page, 'home-ground-shot-07-exploration-landmark')

  const groundCanvas = await ground.locator('canvas').boundingBox()
  if (groundCanvas) {
    await capture(page, 'home-ground-shot-08-ground-microdetail', null, {
      x: groundCanvas.x + groundCanvas.width * .22,
      y: groundCanvas.y + groundCanvas.height * .58,
      width: groundCanvas.width * .56,
      height: groundCanvas.height * .40,
    })
  }

  const nearby = page.getByRole('button', { name: 'Describe nearby Ground places' })
  await nearby.click()
  await page.waitForTimeout(180)
  assertReceipt('ground-nearby-semantic-discovery', await nearby.isVisible(), 'Nearby semantic discovery control must remain available')

  const summonOrb = page.getByRole('button', { name: 'Summon Ground Orb' })
  await summonOrb.click()
  await page.waitForFunction(() => document.querySelector('.ground-spatial-root[data-ground-exploration="first-person"]')?.getAttribute('data-ground-orb') === 'summoned-physical', null, { timeout: 3_000 })
  await settleFrames(page, 16)
  assertReceipt('ground-physical-orb-summoned', await ground.getAttribute('data-ground-orb') === 'summoned-physical', `orb=${await ground.getAttribute('data-ground-orb')}`)
  await capture(page, 'home-ground-shot-09-ground-interaction')

  const homeButton = page.getByRole('button', { name: 'Return Home' })
  await homeButton.click()
  await page.waitForFunction(() => document.querySelector('.ground-spatial-root[data-ground-exploration="first-person"]')?.getAttribute('data-ground-camera-mode') === 'unwind', null, { timeout: 4_000 })
  await capture(page, 'home-ground-shot-10-unwind-initiation')
  await page.waitForTimeout(760)
  await capture(page, 'home-ground-shot-11-mid-unwind')
  await page.waitForURL((url) => normalizedPathname(url.toString()) === '/home', { timeout: 10_000 })
  await waitForHome(page)
  await settleFrames(page, 24)
  await capture(page, 'home-ground-shot-12-home-restored')

  const restored = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  assertReceipt('home-restored-camera', /cinematic-third-person|cinematic-look/.test((await restored.getAttribute('data-home-camera-mode')) ?? ''), `camera=${await restored.getAttribute('data-home-camera-mode')}`)
  assertReceipt('home-restored-avatar', await page.getByTestId('urai-home-embodied-avatar').count() === 1, 'Home Avatar semantic presence must be restored')
  assertReceipt('home-restored-orb', await page.getByTestId('urai-home-webgl-orb').count() === 1, 'Home Orb semantic presence must be restored')
  assertReceipt('desktop-runtime-errors', pageErrors.length === 0, pageErrors.join(' | ') || 'none')

  await closeAndRecord(context, page, 'home-ground-motion-desktop-full-journey')
}

async function runMobileJourney(browser) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 873 },
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: videoDir, size: { width: 393, height: 873 } },
  })
  const page = await context.newPage()
  await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const home = await waitForHome(page)
  await settleFrames(page, 30)
  await capture(page, 'home-ground-shot-13-mobile-home')
  const box = await home.locator('canvas').boundingBox()
  if (!box) throw new Error('mobile Home canvas missing')
  await page.touchscreen.tap(box.x + box.width * .50, box.y + box.height * .85)
  await page.waitForURL((url) => normalizedPathname(url.toString()) === '/ground', { timeout: 10_000 })
  const ground = await waitForGround(page)
  await settleFrames(page, 18)
  await capture(page, 'home-ground-shot-14-mobile-ground')
  const controls = page.getByRole('group', { name: 'Ground first-person movement controls' })
  assertReceipt('mobile-controls-visible', await controls.isVisible(), 'semantic mobile movement controls must be visible')
  assertReceipt('mobile-no-overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobile Ground must not overflow horizontally')
  assertReceipt('mobile-ground-ready', await ground.getAttribute('data-ground-ready') === 'true', 'mobile Ground must become ready')
  assertReceipt('mobile-orb-control', await page.getByRole('button', { name: 'Summon Ground Orb' }).isVisible(), 'mobile Ground must keep Orb summon reachable')
  await closeAndRecord(context, page, 'home-ground-motion-mobile-entry')
}

async function runReducedMotionJourney(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const home = await waitForHome(page)
  const box = await home.locator('canvas').boundingBox()
  if (!box) throw new Error('reduced-motion Home canvas missing')
  await page.mouse.click(box.x + box.width * .50, box.y + box.height * .84)
  await page.waitForURL((url) => normalizedPathname(url.toString()) === '/ground', { timeout: 8_000 })
  const ground = await waitForGround(page)
  await settleFrames(page, 12)
  await capture(page, 'home-ground-shot-15-reduced-motion-ground')
  assertReceipt('reduced-motion-first-person', await ground.getAttribute('data-ground-camera') === 'eye-level-terrain-following', 'reduced motion must preserve first-person spatial meaning')
  assertReceipt('reduced-motion-no-pointer-lock', await page.evaluate(() => document.pointerLockElement === null), 'reduced motion must never require pointer lock')
  assertReceipt('reduced-motion-world-ready', await ground.getAttribute('data-ground-world-ready') === 'true', 'reduced motion must retain the physical Ground world')
  await closeAndRecord(context, page, 'home-ground-motion-reduced-entry')
}

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  await runDesktopJourney(browser)
  await runMobileJourney(browser)
  await runReducedMotionJourney(browser)
} catch (error) {
  receipt.errors.push({ id: 'proof-runner', error: String(error) })
} finally {
  await browser.close().catch(() => {})
}

const requiredShots = Array.from({ length: 15 }, (_, index) => `home-ground-shot-${String(index + 1).padStart(2, '0')}`)
for (const prefix of requiredShots) {
  if (!receipt.screenshots.some((shot) => shot.id.startsWith(prefix))) receipt.errors.push({ id: prefix, error: 'required retained frame missing' })
}
const videoFiles = await readdir(videoDir).catch(() => [])
assertReceipt('retained-motion-present', videoFiles.some((name) => name.endsWith('.webm')), `videos=${videoFiles.join(',') || 'none'}`)

receipt.passed = receipt.errors.length === 0
await writeFile(path.join(outputDir, 'home-ground-canon-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)

if (!receipt.passed) process.exit(1)
