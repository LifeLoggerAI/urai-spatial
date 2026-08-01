import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
const owner = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const states = [
  { id: 'permission-limited', query: 'homeState=permission-limited', mode: 'permission-limited', orb: 'privacy' },
  { id: 'unavailable', query: 'homeState=unavailable', mode: 'unavailable', orb: 'warning' },
  { id: 'offline', query: 'homeState=offline', mode: 'offline', orb: 'warning' },
]

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
const receipt = { schemaVersion: 'urai-home-state-proof-1', exactHead, capturedAt: new Date().toISOString(), captures: [], errors: [] }

async function capture(state, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: options.reducedMotion, forcedColors: options.forcedColors })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  const query = `homeAssetReview=1&${state.query}`
  const record = { id: state.id, query, pageErrors, passed: false }
  try {
    const response = await page.goto(`${base}/home/?${query}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.locator(owner).waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true', owner, { timeout: 45_000 })
    const root = page.locator(owner)
    record.status = response?.status()
    record.mode = await root.getAttribute('data-home-personalization-mode')
    record.orb = await root.getAttribute('data-home-orb-state')
    record.pointerLock = await page.evaluate(() => document.pointerLockElement === null)
    record.screenshot = `${state.id}-${exactHead.slice(0, 12)}.png`
    await page.screenshot({ path: path.join(outputDir, record.screenshot) })
    record.passed = record.status === 200 && record.mode === state.mode && record.orb === state.orb && record.pointerLock && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.captures.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close()
  }
}

for (const state of states) await capture(state)
await capture({ id: 'reduced-motion', query: 'homePrivateFixture=1', mode: 'private-personalized', orb: 'idle' }, { reducedMotion: 'reduce' })
await capture({ id: 'forced-colors', query: 'homePrivateFixture=1', mode: 'private-personalized', orb: 'idle' }, { forcedColors: 'active' })

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const transition = { id: 'home-real-offline-transition', passed: false }
try {
  await page.goto(`${base}/home/?homeAssetReview=1`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.locator(owner).waitFor({ state: 'visible', timeout: 45_000 })
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-personalization-mode') === 'offline', owner, { timeout: 15_000 })
  transition.mode = await page.locator(owner).getAttribute('data-home-personalization-mode')
  transition.orb = await page.locator(owner).getAttribute('data-home-orb-state')
  transition.passed = transition.mode === 'offline' && transition.orb === 'warning'
} catch (error) { transition.error = String(error) }
finally {
  await context.setOffline(false).catch(() => {})
  await context.close()
  receipt.captures.push(transition)
  if (!transition.passed) receipt.errors.push(transition)
}

await browser.close()
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
