import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { readLocalizationLayoutMetrics } from './lib/localization-layout-metrics.mjs'
import { waitForLocalizationHomeScene } from './lib/localization-home-readiness.mjs'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/localization-preparation-proof')
const exactHead = String(process.env.URAI_EXACT_HEAD || '').trim()
if (!/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('URAI_EXACT_HEAD must be an exact lowercase 40-character SHA')
await fs.mkdir(outputDir, { recursive: true })

const cases = [
  { id: 'desktop-en-home', locale: 'en', dir: 'ltr', route: '/home?demo=1&lang=en', viewport: { width: 1440, height: 900 } },
  { id: 'desktop-ar-home-rtl', locale: 'ar', dir: 'rtl', route: '/home?demo=1&lang=ar', viewport: { width: 1440, height: 900 } },
  { id: 'phone-ar-home-rtl-expanded', locale: 'ar', dir: 'rtl', route: '/home?demo=1&lang=ar', viewport: { width: 390, height: 844 }, touch: true, expansion: true },
  { id: 'landscape-fa-lifemap-rtl', locale: 'fa', dir: 'rtl', route: '/life-map?demo=1&overview=1&lang=fa', viewport: { width: 844, height: 390 }, touch: true },
  { id: 'tablet-nl-home-expanded', locale: 'nl', dir: 'ltr', route: '/home?demo=1&lang=nl', viewport: { width: 820, height: 1180 }, touch: true, expansion: true },
  { id: 'reduced-motion-ar-home', locale: 'ar', dir: 'rtl', route: '/home?demo=1&lang=ar', viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' },
  { id: 'no-webgl-ar-home', locale: 'ar', dir: 'rtl', route: '/home?demo=1&lang=ar', viewport: { width: 390, height: 844 }, touch: true, noWebGL: true },
  { id: 'offline-ar-home', locale: 'ar', dir: 'rtl', route: '/home?homeAssetReview=1&lang=ar', viewport: { width: 390, height: 844 }, touch: true, offlineAfterLoad: true },
]

function diagnostics(page) {
  const pageErrors = []
  const failedRequests = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' })
  })
  return () => ({ pageErrors, failedRequests })
}

async function waitLocale(page, locale, dir) {
  await page.waitForFunction(([expectedLocale, expectedDir]) => {
    const root = document.documentElement
    return root.lang === expectedLocale
      && root.dir === expectedDir
      && root.dataset.uraiLocale === expectedLocale
      && root.dataset.uraiLocaleDirection === expectedDir
      && root.dataset.uraiLocaleRuntimeStatus === 'machine-preparation-only'
  }, [locale, dir], { timeout: 45_000 })
}

async function applyExpansionFixture(page) {
  await page.evaluate(() => {
    document.documentElement.dataset.uraiSyntheticTextExpansion = '35-percent-machine-qa'
    const elements = Array.from(document.querySelectorAll('button,a,summary,h1,h2,h3,p,span,label,[role="status"],[role="alert"]'))
    for (const element of elements) {
      if (!(element instanceof HTMLElement)) continue
      if (element.children.length > 0) continue
      const text = (element.textContent || '').trim()
      if (text.length < 4 || element.dataset.uraiExpansionOriginal) continue
      element.dataset.uraiExpansionOriginal = text
      const target = Math.ceil(text.length * 1.35)
      let expanded = text
      while (expanded.length < target) expanded += ' ' + text
      element.textContent = expanded.slice(0, target)
    }
  })
}

async function layoutMetrics(page) {
  return page.evaluate(readLocalizationLayoutMetrics)
}

const receipt = {
  schemaVersion: 'urai-localization-preparation-proof-1',
  exactHead,
  generatedAt: new Date().toISOString(),
  status: 'running',
  truthBoundary: 'machine-preparation-only-native-review-required',
  syntheticExpansion: '35-percent-layout-stress-not-translated-copy',
  cases: [],
  errors: [],
}

const browser = await chromium.launch({ executablePath: process.env.URAI_PROOF_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  for (const spec of cases) {
    const record = { id: spec.id, locale: spec.locale, dir: spec.dir, passed: false }
    receipt.cases.push(record)
    const context = await browser.newContext({
      viewport: spec.viewport,
      hasTouch: Boolean(spec.touch),
      isMobile: Boolean(spec.touch && spec.viewport.width < 600),
      reducedMotion: spec.reducedMotion || 'no-preference',
    })
    if (spec.noWebGL) {
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (String(type).toLowerCase().includes('webgl')) return null
          return original.call(this, type, ...args)
        }
      })
    }
    await context.addInitScript(() => {
      try {
        localStorage.setItem('urai:onboarding:v2:complete', '1')
        localStorage.setItem('urai:onboarding:v3:setup-complete', '1')
      } catch {}
    })
    const page = await context.newPage()
    const readDiagnostics = diagnostics(page)
    try {
      const response = await page.goto(base + spec.route, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      assert.ok(response?.ok(), `route failed: ${spec.route}`)
      await waitLocale(page, spec.locale, spec.dir)

      const isHome = new URL(spec.route, base).pathname.replace(/\/+$/, '') === '/home'
      const homeScene = isHome && !spec.noWebGL ? await waitForLocalizationHomeScene(page) : null
      if (homeScene) record.homeSceneAssetsReady = true

      if (spec.noWebGL) {
        const fallback = page.getByTestId('urai-home-semantic-fallback')
        await fallback.waitFor({ state: 'visible', timeout: 45_000 })
        const runtime = page.locator('.urai-home-spatial-runtime-layer[data-webgl-state="unavailable"]').first()
        await runtime.waitFor({ state: 'visible', timeout: 45_000 })
        assert.equal(await runtime.getAttribute('data-webgl-ready'), 'false')
      }

      if (spec.offlineAfterLoad) {
        // Renderer capability becomes ready before the suspended Home assets.
        // This case exercises going offline AFTER the world loaded, so bind it
        // to the scene's actual readiness before waiting for network quiescence.
        assert.ok(homeScene, 'offline-after-load requires the loaded Home scene')
        await page.waitForLoadState('networkidle', { timeout: 45_000 })
        assert.equal(await homeScene.getAttribute('data-home-assets-ready'), 'true')
        record.offlineSceneReadyBeforeDisconnect = true
        await context.setOffline(true)
        await page.evaluate(() => window.dispatchEvent(new Event('offline')))
        await page.waitForFunction(([locale, direction]) => document.documentElement.lang === locale && document.documentElement.dir === direction, [spec.locale, spec.dir], { timeout: 45_000 })
        assert.equal(await page.locator('html').getAttribute('dir'), spec.dir)
        assert.equal(await page.locator('html').getAttribute('lang'), spec.locale)
        assert.equal(await homeScene.getAttribute('data-home-assets-ready'), 'true', 'loaded Home must survive the offline transition')
        record.offlineSceneReadyAfterDisconnect = true
      }

      if (spec.expansion) await applyExpansionFixture(page)
      const metrics = await layoutMetrics(page)
      record.metrics = metrics
      record.runtimeStatus = await page.locator('html').getAttribute('data-urai-locale-runtime-status')
      record.nativeReview = await page.locator('html').getAttribute('data-urai-locale-native-review')
      record.reducedMotion = spec.reducedMotion === 'reduce'
      record.noWebGL = Boolean(spec.noWebGL)
      record.offlineAfterLoad = Boolean(spec.offlineAfterLoad)
      record.syntheticExpansionApplied = Boolean(spec.expansion)
      assert.equal(record.runtimeStatus, 'machine-preparation-only')
      assert.equal(record.nativeReview, spec.locale === 'en' ? 'source' : 'required')
      assert.ok(metrics.scrollWidth <= metrics.clientWidth + 4, `horizontal overflow: ${metrics.scrollWidth}/${metrics.clientWidth}`)
      assert.equal(metrics.clippedInteractive.length, 0, 'interactive controls were fully outside the viewport')
      assert.equal(metrics.undersizedVisibleInteractive.length, 0, 'visually exposed interactive controls must remain at least 32px in both dimensions')
      const filename = spec.id + '.png'
      await page.screenshot({ path: path.join(outputDir, filename), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
      record.screenshot = filename
      record.passed = true
    } catch (error) {
      record.error = error instanceof Error ? error.stack || error.message : String(error)
      receipt.errors.push({ id: spec.id, error: record.error })
    } finally {
      record.diagnostics = readDiagnostics()
      const expectedOfflinePageErrors = spec.offlineAfterLoad
        ? record.diagnostics.pageErrors.filter((message) => /^Error: Could not load \/assets\//.test(message))
        : []
      const unexpectedPageErrors = record.diagnostics.pageErrors.filter((message) => !expectedOfflinePageErrors.includes(message))
      if (expectedOfflinePageErrors.length) record.expectedOfflinePageErrors = expectedOfflinePageErrors
      if (unexpectedPageErrors.length) {
        record.passed = false
        receipt.errors.push({ id: spec.id, error: 'page errors', pageErrors: unexpectedPageErrors })
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
}

receipt.status = receipt.cases.every((item) => item.passed) && receipt.errors.length === 0 ? 'passed' : 'failed'
await fs.writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify(receipt, null, 2))
if (receipt.status !== 'passed') process.exitCode = 1
