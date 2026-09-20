import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const exactSha = String(process.env.URAI_EXACT_HEAD || '').trim()
const baseUrl = String(process.env.URAI_REFERENCE_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = process.env.URAI_REFERENCE_OUT_DIR || 'artifacts/reference-estate-proof'
if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('URAI_EXACT_HEAD must be a 40-character SHA')

await fs.mkdir(path.join(outDir, 'screenshots'), { recursive: true })
const receipt = { schemaVersion: 1, exactSha, startedAt: new Date().toISOString(), captures: [], failures: [] }

const devices = {
  desktop: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
}

function abs(route) { return new URL(route, baseUrl + '/').toString() }
function slug(value) { return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() }

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.waitForTimeout(700)
}

async function capture(browser, cfg) {
  const device = devices[cfg.device || 'desktop']
  const context = await browser.newContext({
    ...device,
    reducedMotion: cfg.reducedMotion ? 'reduce' : 'no-preference',
  })
  if (cfg.noWebGL) {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return original.call(this, type, ...args)
      }
    })
  }

  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  const consoleErrors = []
  const failedRequests = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push(String(e?.message || e)))
  page.on('requestfailed', (request) => {
    const why = request.failure()?.errorText || 'request failed'
    if (!why.includes('ERR_ABORTED')) failedRequests.push(`${request.method()} ${request.url()} ${why}`)
  })

  const record = {
    id: cfg.id,
    system: cfg.system,
    state: cfg.state,
    route: cfg.route,
    device: cfg.device || 'desktop',
    reducedMotion: Boolean(cfg.reducedMotion),
    noWebGL: Boolean(cfg.noWebGL),
    screenshot: null,
    finalUrl: null,
    consoleErrors,
    failedRequests,
  }

  try {
    const response = await page.goto(abs(cfg.route), { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${cfg.route}`)
    if (cfg.marker) await page.locator(cfg.marker).first().waitFor({ state: 'attached', timeout: 45000 })
    if (cfg.text) await page.getByText(cfg.text, { exact: false }).first().waitFor({ state: 'visible', timeout: 45000 })
    await settle(page)
    if (cfg.action) await cfg.action(page)
    if (cfg.waitAfterActionMs) await page.waitForTimeout(cfg.waitAfterActionMs)
    if (!cfg.skipPostActionSettle) await settle(page)

    const file = path.join('screenshots', `${slug(cfg.id)}.png`)
    await page.screenshot({ path: path.join(outDir, file), fullPage: false, animations: 'disabled', caret: 'hide', scale: 'css', timeout: 120000 })
    record.screenshot = file
    record.finalUrl = page.url()
    receipt.captures.push(record)
    console.log('REFERENCE_CAPTURE_OK', cfg.id, page.url())
  } catch (error) {
    record.finalUrl = page.url()
    record.error = String(error?.message || error)
    receipt.failures.push(record)
    console.error('REFERENCE_CAPTURE_FAIL', cfg.id, record.error)
  } finally {
    await context.close()
  }
}


async function enterFirstPersonHome(page) {
  const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]').first()
  await owner.waitFor({ state:'visible', timeout:45000 })
  await page.waitForFunction(() => document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout:45000 })
  const enter = page.getByRole('button', { name:'Enter first-person Home' }).first()
  await enter.focus()
  await enter.press('Enter')
  await page.waitForFunction(() => document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')?.getAttribute('data-home-stable-state') === 'AVATAR_HOME_FIRST_PERSON', null, { timeout:30000 })
}

async function assertWeather(page, expectedTone, { visible = true, source } = {}) {
  const weather = page.getByTestId('home-personal-emotional-weather')
  await weather.waitFor({ state:'attached', timeout:30000 })
  const actualTone = await weather.getAttribute('data-home-emotional-weather-tone')
  const actualVisible = await weather.getAttribute('data-home-emotional-weather-visible')
  const actualSource = await weather.getAttribute('data-home-emotional-weather-source')
  if (actualTone !== expectedTone) throw new Error(`Expected weather tone ${expectedTone}, got ${actualTone}`)
  if ((actualVisible === 'true') !== visible) throw new Error(`Expected weather visible=${visible}, got ${actualVisible}`)
  if (source && actualSource !== source) throw new Error(`Expected weather source ${source}, got ${actualSource}`)
}

async function enterPrivateWeather(page, expectedTone) {
  await enterFirstPersonHome(page)
  await assertWeather(page, expectedTone, { visible:true, source:'disclosed-safe-private-synthetic-review-fixture' })
}


async function enterPhysicalPassport(page, expectedState = 'dormant') {
  await enterFirstPersonHome(page)
  const passport = page.getByTestId('home-passport-physical-control')
  await passport.waitFor({ state:'attached', timeout:30000 })
  const dims = await passport.getAttribute('data-home-passport-dimensions-mm')
  if (dims !== '185x260x18') throw new Error(`Unexpected Passport dimensions ${dims}`)
  const state = await passport.getAttribute('data-home-passport-artifact-state')
  if (state !== expectedState) throw new Error(`Expected Passport state ${expectedState}, got ${state}`)
  return passport
}

async function enterPassportReferenceSheet(page, expectedMode) {
  await enterFirstPersonHome(page)
  const sheet = page.getByTestId('home-passport-reference-sheet')
  await sheet.waitFor({ state:'visible', timeout:30000 })
  const mode = await sheet.getAttribute('data-home-passport-reference')
  if (mode !== expectedMode) throw new Error(`Expected Passport reference mode ${expectedMode}, got ${mode}`)
  const dims = await sheet.getAttribute('data-home-passport-dimensions-mm')
  if (dims !== '185x260x18') throw new Error(`Unexpected Passport reference dimensions ${dims}`)
}

async function activatePhysicalPassport(page) {
  const passport = await enterPhysicalPassport(page, 'dormant')
  await passport.focus()
  await passport.press('Enter')
  await page.waitForURL(/\/passport(?:\?|$)/, { timeout:30000 })
  await page.locator('main[data-route-owner="passport-ownership-vault"]').waitFor({ state:'visible', timeout:30000 })
}

async function assertLifeMapPhase(page, phase) {
  const root = page.locator('[data-testid="urai-true-3d-life-map"]').first()
  await root.waitFor({ state:'visible', timeout:45000 })
  await page.waitForFunction((expected) => document.querySelector('[data-testid="urai-true-3d-life-map"]')?.getAttribute('data-life-map-phase') === expected, phase, { timeout:45000 })
}

async function selectLifeMapPhase(page, phase) {
  const root = page.locator('[data-testid="urai-true-3d-life-map"]').first()
  await root.waitFor({ state:'visible', timeout:45000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="urai-true-3d-life-map"]')?.getAttribute('data-life-map-render-ready') === 'true', null, { timeout:45000 })
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('urai:life-map-select-node', { detail:{ nodeId:'memory-thread', source:'semantic' } })))
  await assertLifeMapPhase(page, phase)
}

async function enterRitualReview(page, expectedState) {
  await enterFirstPersonHome(page)
  const review = page.getByTestId('home-ritual-reference')
  await review.waitFor({ state:'visible', timeout:30000 })
  const actual = await review.getAttribute('data-home-ritual-reference-state')
  if (actual !== expectedState) throw new Error(`Expected Ritual reference state ${expectedState}, got ${actual}`)
  const fixture = await review.getAttribute('data-home-ritual-fixture')
  if (fixture !== 'disclosed-synthetic-no-personal-data') throw new Error(`Unexpected Ritual fixture disclosure ${fixture}`)
}

async function enterGlobalFieldEarth(page, expectedState) {
  await enterFirstPersonHome(page)
  const status = page.getByTestId('home-global-emotional-field-earth-status')
  await status.waitFor({ state:'attached', timeout:30000 })
  const actual = await status.getAttribute('data-global-field-state')
  if (actual !== expectedState) throw new Error(`Expected Global Emotional Field Earth state ${expectedState}, got ${actual}`)
}

const simple = [

  { id:'MEMSTAR-001', system:'Memory Star', state:'neutral-isolated-morphology', route:'/life-map?demo=1&memoryId=memory-thread&node=memory-thread&memoryStarReview=isolated', marker:'[data-testid="urai-true-3d-life-map"]' },
  { id:'MEMSTAR-002', system:'Memory Star', state:'life-map-overview', route:'/life-map?demo=1&overview=1', marker:'[data-testid="urai-true-3d-life-map"]', action: async (page) => assertLifeMapPhase(page, 'overview') },
  { id:'MEMSTAR-003', system:'Memory Star', state:'near-cluster', route:'/life-map?demo=1&memoryId=memory-thread&node=memory-thread&memoryStarReview=near-cluster', marker:'[data-testid="urai-true-3d-life-map"]' },
  { id:'MEMSTAR-004', system:'Memory Star', state:'hover', route:'/life-map?demo=1&memoryId=memory-thread&node=memory-thread&memoryStarReview=hover', marker:'[data-testid="urai-true-3d-life-map"]' },
  { id:'MEMSTAR-005', system:'Memory Star', state:'selected', route:'/life-map?demo=1&memoryId=memory-thread&node=memory-thread', marker:'[data-testid="urai-true-3d-life-map"]', action: async (page) => assertLifeMapPhase(page, 'arrival') },
  { id:'MEMSTAR-006', system:'Memory Star', state:'departure', route:'/life-map?demo=1&overview=1', marker:'[data-testid="urai-true-3d-life-map"]', action: async (page) => selectLifeMapPhase(page, 'departure'), skipPostActionSettle:true },
  { id:'MEMSTAR-007', system:'Memory Star', state:'travel', route:'/life-map?demo=1&overview=1', marker:'[data-testid="urai-true-3d-life-map"]', action: async (page) => selectLifeMapPhase(page, 'travel'), skipPostActionSettle:true },
  { id:'MEMSTAR-008', system:'Memory Star', state:'approach', route:'/life-map?demo=1&overview=1', marker:'[data-testid="urai-true-3d-life-map"]', action: async (page) => selectLifeMapPhase(page, 'approach'), skipPostActionSettle:true },
  { id:'MEMSTAR-009', system:'Memory Star', state:'arrival-pre-focus', route:'/life-map?demo=1&memoryId=memory-thread&node=memory-thread', marker:'[data-testid="urai-true-3d-life-map"]', action: async (page) => assertLifeMapPhase(page, 'arrival') },
  { id:'MEMSTAR-010', system:'Memory Star', state:'phone-portrait', route:'/life-map?demo=1&memoryId=memory-thread&node=memory-thread', marker:'[data-testid="urai-true-3d-life-map"]', device:'mobile', action: async (page) => assertLifeMapPhase(page, 'arrival') },
  { id:'MEMSTAR-011', system:'Memory Star', state:'reduced-motion', route:'/life-map?demo=1&memoryId=memory-thread&node=memory-thread', marker:'[data-testid="urai-true-3d-life-map"]', reducedMotion:true, action: async (page) => assertLifeMapPhase(page, 'arrival') },
  { id:'MEMSTAR-012', system:'Memory Star', state:'low-performance-accessibility-semantic-fallback', route:'/life-map?demo=1&overview=1', noWebGL:true },

  { id:'PASSPORT-PHYS-001', system:'Physical Home Passport', state:'closed-neutral-model-sheet', route:'/home?homeAssetReview=1&homePassportReference=neutral-model-sheet', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPassportReferenceSheet(page, 'neutral-model-sheet') },
  { id:'PASSPORT-PHYS-002', system:'Physical Home Passport', state:'dimensions-human-scale', route:'/home?homeAssetReview=1&homePassportReference=human-scale', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPassportReferenceSheet(page, 'human-scale') },
  { id:'PASSPORT-PHYS-003', system:'Physical Home Passport', state:'home-placement-establishing-view', route:'/home?homeAssetReview=1&homePassportReviewState=dormant', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPhysicalPassport(page, 'dormant') },
  { id:'PASSPORT-PHYS-004', system:'Physical Home Passport', state:'first-person-dormant', route:'/home?homeAssetReview=1&homePassportReviewState=dormant', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPhysicalPassport(page, 'dormant') },
  { id:'PASSPORT-PHYS-005', system:'Physical Home Passport', state:'pointer-keyboard-focus', route:'/home?homeAssetReview=1&homePassportReviewState=focused', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPhysicalPassport(page, 'focused') },
  { id:'PASSPORT-PHYS-006', system:'Physical Home Passport', state:'selected', route:'/home?homeAssetReview=1&homePassportReviewState=selected', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPhysicalPassport(page, 'selected') },
  { id:'PASSPORT-PHYS-007', system:'Physical Home Passport', state:'opening-midpoint', route:'/home?homeAssetReview=1&homePassportReviewState=opening', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPhysicalPassport(page, 'opening'), waitAfterActionMs:350 },
  { id:'PASSPORT-PHYS-008', system:'Physical Home Passport', state:'trust-handoff-to-passport', route:'/home?homeAssetReview=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: activatePhysicalPassport },
  { id:'PASSPORT-PHYS-009', system:'Physical Home Passport', state:'recent-auth-locked', route:'/passport?assetReview=1&passportReview=recent-auth-locked', marker:'main[data-route-owner="passport-ownership-vault"]', text:'REFERENCE REVIEW — recent-auth locked' },
  { id:'PASSPORT-PHYS-010', system:'Physical Home Passport', state:'unavailable-data-not-mounted', route:'/passport?assetReview=1&passportReview=unavailable', marker:'main[data-route-owner="passport-ownership-vault"]', text:'REFERENCE REVIEW — ownership data unavailable' },
  { id:'PASSPORT-PHYS-011', system:'Physical Home Passport', state:'return-to-exact-home-origin', route:'/home?homeAssetReview=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => { await activatePhysicalPassport(page); await page.goBack({ waitUntil:'networkidle' }); await page.waitForFunction(() => document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')?.getAttribute('data-home-stable-state') === 'AVATAR_HOME_FIRST_PERSON', null, { timeout:30000 }); await page.getByTestId('home-passport-physical-control').waitFor({ state:'attached', timeout:30000 }) } },
  { id:'PASSPORT-PHYS-012', system:'Physical Home Passport', state:'phone-touch-adaptation', route:'/home?homeAssetReview=1&homePassportReviewState=dormant', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', device:'mobile', action: async (page) => enterPhysicalPassport(page, 'dormant') },
  { id:'PASSPORT-PHYS-013', system:'Physical Home Passport', state:'reduced-motion', route:'/home?homeAssetReview=1&homePassportReviewState=dormant', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', reducedMotion:true, action: async (page) => enterPhysicalPassport(page, 'dormant') },
  { id:'PASSPORT-PHYS-014', system:'Physical Home Passport', state:'reduced-stimulation', route:'/home?homeAssetReview=1&homePassportReviewState=dormant&homeReducedStimulation=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => { const passport = await enterPhysicalPassport(page, 'dormant'); const reduced = await passport.getAttribute('data-home-passport-reduced-stimulation'); if (reduced !== 'true') throw new Error(`Expected Passport reduced stimulation, got ${reduced}`) } },
  { id:'PASSPORT-PHYS-015', system:'Physical Home Passport', state:'semantic-fallback', route:'/passport?assetReview=1&passportReview=unavailable', marker:'main[data-route-owner="passport-ownership-vault"]', text:'REFERENCE REVIEW — ownership data unavailable', noWebGL:true },

  { id:'WEATHER-001', system:'Personal Emotional Weather', state:'same-home-world-forming-desktop', route:'/home?homeAssetReview=1&homeState=world-forming', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]' },
  { id:'WEATHER-002', system:'Personal Emotional Weather', state:'clear-desktop', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=clear', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPrivateWeather(page, 'clear') },
  { id:'WEATHER-003', system:'Personal Emotional Weather', state:'active-desktop', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=active', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPrivateWeather(page, 'active') },
  { id:'WEATHER-004', system:'Personal Emotional Weather', state:'heavy-desktop', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=heavy', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPrivateWeather(page, 'heavy') },
  { id:'WEATHER-005', system:'Personal Emotional Weather', state:'recovering-transition-midpoint-desktop', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=clear', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => { await enterPrivateWeather(page, 'clear'); await page.evaluate(() => window.dispatchEvent(new CustomEvent('urai:home-emotional-weather', { detail:{ state:'hopeful' } }))) }, waitAfterActionMs:700 },
  { id:'WEATHER-006', system:'Personal Emotional Weather', state:'recovering-settled-desktop', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=clear', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => { await enterPrivateWeather(page, 'clear'); await page.evaluate(() => window.dispatchEvent(new CustomEvent('urai:home-emotional-weather', { detail:{ state:'hopeful' } }))) }, waitAfterActionMs:8000 },
  { id:'WEATHER-007', system:'Personal Emotional Weather', state:'night-clear', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=clear&homeTimeReview=night', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPrivateWeather(page, 'clear') },
  { id:'WEATHER-008', system:'Personal Emotional Weather', state:'night-heavy', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=heavy&homeTimeReview=night', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterPrivateWeather(page, 'heavy') },
  { id:'WEATHER-009', system:'Personal Emotional Weather', state:'phone-portrait-active', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=active', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', device:'mobile', action: async (page) => enterPrivateWeather(page, 'active') },
  { id:'WEATHER-010', system:'Personal Emotional Weather', state:'phone-portrait-heavy', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=heavy', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', device:'mobile', action: async (page) => enterPrivateWeather(page, 'heavy') },
  { id:'WEATHER-011', system:'Personal Emotional Weather', state:'reduced-motion-heavy', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=heavy', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', reducedMotion:true, action: async (page) => enterPrivateWeather(page, 'heavy') },
  { id:'WEATHER-012', system:'Personal Emotional Weather', state:'reduced-stimulation-heavy', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=heavy&homeReducedStimulation=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => { await enterPrivateWeather(page, 'heavy'); const weather = page.getByTestId('home-personal-emotional-weather'); const reduced = await weather.getAttribute('data-home-emotional-weather-reduced-stimulation'); if (reduced !== 'true') throw new Error(`Expected weather reduced stimulation, got ${reduced}`) } },
  { id:'WEATHER-013', system:'Personal Emotional Weather', state:'permission-limited-quiet-world', route:'/home?homeAssetReview=1&homeState=permission-limited', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => assertWeather(page, 'forming', { visible:false }) },
  { id:'WEATHER-014', system:'Personal Emotional Weather', state:'unavailable-no-personal-data', route:'/home?homeAssetReview=1&homeState=unavailable', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => assertWeather(page, 'forming', { visible:false }) },
  { id:'WEATHER-015', system:'Personal Emotional Weather', state:'disclosed-sample-soft', route:'/home?homeAssetReview=1&homeSample=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => assertWeather(page, 'soft', { visible:true, source:'disclosed-public-sample' }) },
  { id:'WEATHER-016', system:'Personal Emotional Weather', state:'place-specific-private-symbolic-location-synthetic-review', route:'/home?homeAssetReview=1&homePrivateFixture=1&homeWeatherReview=heavy&homeWeatherPlaceReview=synthetic-private-location', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => { await enterPrivateWeather(page, 'heavy'); const weather = page.getByTestId('home-personal-emotional-weather'); const place = await weather.getAttribute('data-home-emotional-weather-place-overlay'); if (place !== 'disclosed-synthetic-private-location') throw new Error(`Unexpected place overlay provenance ${place}`) } },
  { id:'WEATHER-017', system:'Personal Emotional Weather', state:'place-specific-emotional-overlay-disclosed-demo', route:'/location-map?demo=1', marker:'[data-location-map-source="disclosed-demo"]', action: async (page) => { const beacon = page.locator('.locationAtlasBeacon').first(); await beacon.waitFor({ state:'visible', timeout:30000 }); await beacon.click(); await page.locator('.locationAtlasSelection').waitFor({ state:'visible', timeout:30000 }); await page.getByText('Sample place · no personal location history is displayed.', { exact:false }).waitFor({ state:'visible', timeout:30000 }) } },
  { id:'WEATHER-018', system:'Personal Emotional Weather', state:'no-webgl-semantic-fallback', route:'/home?homeAssetReview=1&homeState=unavailable', noWebGL:true },

  { id:'EARTH-001', system:'Global Emotional Field Earth', state:'unavailable', route:'/home?homeAssetReview=1&homeGlobalFieldReview=unavailable', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterGlobalFieldEarth(page, 'unavailable') },
  { id:'EARTH-002', system:'Global Emotional Field Earth', state:'suppressed', route:'/home?homeAssetReview=1&homeGlobalFieldReview=suppressed', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterGlobalFieldEarth(page, 'suppressed') },
  { id:'EARTH-003', system:'Global Emotional Field Earth', state:'home-integration', route:'/home?homeAssetReview=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterGlobalFieldEarth(page, 'unavailable') },
  { id:'EARTH-004', system:'Global Emotional Field Earth', state:'phone', route:'/home?homeAssetReview=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', device:'mobile', action: async (page) => enterGlobalFieldEarth(page, 'unavailable') },
  { id:'EARTH-005', system:'Global Emotional Field Earth', state:'reduced-motion', route:'/home?homeAssetReview=1', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', reducedMotion:true, action: async (page) => enterGlobalFieldEarth(page, 'unavailable') },

  { id:'RITUAL-001', system:'Rituals', state:'shared-platform-neutral', route:'/home?homeAssetReview=1&homeRitualReview=neutral', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'neutral') },
  { id:'RITUAL-002', system:'Rituals', state:'invitation', route:'/home?homeAssetReview=1&homeRitualReview=invitation', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'invitation') },
  { id:'RITUAL-003', system:'Rituals', state:'anniversary-start', route:'/home?homeAssetReview=1&homeRitualReview=anniversary-start', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'anniversary-start') },
  { id:'RITUAL-004', system:'Rituals', state:'anniversary-action', route:'/home?homeAssetReview=1&homeRitualReview=anniversary-action', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'anniversary-action') },
  { id:'RITUAL-005', system:'Rituals', state:'anniversary-completion', route:'/home?homeAssetReview=1&homeRitualReview=anniversary-complete', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'anniversary-complete') },
  { id:'RITUAL-006', system:'Rituals', state:'return-moment', route:'/home?homeAssetReview=1&homeRitualReview=return-moment', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'return-moment') },
  { id:'RITUAL-007', system:'Rituals', state:'threshold-small-map', route:'/home?homeAssetReview=1&homeRitualReview=threshold-small-map', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'threshold-small-map') },
  { id:'RITUAL-008', system:'Rituals', state:'cancel-interruption', route:'/home?homeAssetReview=1&homeRitualReview=cancelled', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'cancelled') },
  { id:'RITUAL-009', system:'Rituals', state:'reduced-motion', route:'/home?homeAssetReview=1&homeRitualReview=reduced-motion', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', reducedMotion:true, action: async (page) => enterRitualReview(page, 'reduced-motion') },
  { id:'RITUAL-010', system:'Rituals', state:'reduced-stimulation', route:'/home?homeAssetReview=1&homeRitualReview=reduced-stimulation', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'reduced-stimulation') },
  { id:'RITUAL-011', system:'Rituals', state:'mobile', route:'/home?homeAssetReview=1&homeRitualReview=mobile', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', device:'mobile', action: async (page) => enterRitualReview(page, 'mobile') },
  { id:'RITUAL-012', system:'Rituals', state:'semantic-fallback', route:'/home?homeAssetReview=1&homeRitualReview=semantic-fallback', marker:'.urai-asset-home-world[data-home-primary-owner="asset-driven"]', action: async (page) => enterRitualReview(page, 'semantic-fallback') },

  { id:'MIRROR-OVERVIEW-DESKTOP', system:'Mirror', state:'overview', route:'/mirror?memoryId=demo%3Aquiet-reset&demo=1', marker:'[data-testid="mirror-spatial-world"]' },
  { id:'MIRROR-OVERVIEW-MOBILE', system:'Mirror', state:'overview-mobile', route:'/mirror?memoryId=demo%3Aquiet-reset&demo=1', marker:'[data-testid="mirror-spatial-world"]', device:'mobile' },
  { id:'MIRROR-REDUCED-MOTION', system:'Mirror', state:'reduced-motion', route:'/mirror?memoryId=demo%3Aquiet-reset&demo=1', marker:'[data-testid="mirror-spatial-world"]', reducedMotion:true },
  { id:'MIRROR-NOWEBGL', system:'Mirror', state:'no-webgl', route:'/mirror?memoryId=demo%3Aquiet-reset&demo=1', noWebGL:true },

  { id:'PASSPORT-DEMO-DESKTOP', system:'Passport UI', state:'demo-overview', route:'/passport?demo=1', text:'DEMONSTRATION — sample data only' },
  { id:'PASSPORT-DEMO-MOBILE', system:'Passport UI', state:'demo-mobile', route:'/passport?demo=1', text:'DEMONSTRATION — sample data only', device:'mobile' },
  { id:'PASSPORT-REDUCED-MOTION', system:'Passport UI', state:'reduced-motion', route:'/passport?demo=1', text:'DEMONSTRATION — sample data only', reducedMotion:true },
  { id:'PASSPORT-NOWEBGL', system:'Passport UI', state:'no-webgl', route:'/passport?demo=1', text:'All records and actions remain available without WebGL.', noWebGL:true },

  { id:'PRIVACY-DEMO-DESKTOP', system:'Privacy', state:'demo-overview', route:'/privacy-controls?demo=1', text:'DEMONSTRATION — no personal data' },
  { id:'PRIVACY-DEMO-MOBILE', system:'Privacy', state:'demo-mobile', route:'/privacy-controls?demo=1', text:'DEMONSTRATION — no personal data', device:'mobile' },
  { id:'PRIVACY-REDUCED-MOTION', system:'Privacy', state:'reduced-motion', route:'/privacy-controls?demo=1', text:'DEMONSTRATION — no personal data', reducedMotion:true },
  { id:'PRIVACY-NOWEBGL', system:'Privacy', state:'no-webgl', route:'/privacy-controls?demo=1', text:'Semantic controls remain fully available without WebGL.', noWebGL:true },

  { id:'SHADOW-001', system:'Shadow', state:'entry-threshold', route:'/shadow?shadowReview=entry', marker:'[data-testid="urai-shadow-spatial-realm"]' },
  { id:'SHADOW-002', system:'Shadow', state:'neutral-exploration', route:'/shadow?shadowReview=neutral', marker:'[data-testid="urai-shadow-spatial-realm"]' },
  { id:'SHADOW-003', system:'Shadow', state:'uncertainty-focus', route:'/shadow?shadowReview=uncertainty', marker:'[data-testid="urai-shadow-spatial-realm"]' },
  { id:'SHADOW-004', system:'Shadow', state:'contradiction-pattern-focus', route:'/shadow?shadowReview=pattern', marker:'[data-testid="urai-shadow-spatial-realm"]' },
  { id:'SHADOW-005', system:'Shadow', state:'high-load-safe-reduction', route:'/shadow?shadowReview=safe-reduction', marker:'[data-testid="urai-shadow-spatial-realm"]' },
  { id:'SHADOW-006', system:'Shadow', state:'recovery-exit', route:'/shadow?shadowReview=recovery', marker:'[data-testid="urai-shadow-spatial-realm"]' },
  { id:'SHADOW-007', system:'Shadow', state:'reduced-stimulation', route:'/shadow?shadowReview=reduced-stimulation', marker:'[data-testid="urai-shadow-spatial-realm"]' },
  { id:'SHADOW-008', system:'Shadow', state:'mobile', route:'/shadow?shadowReview=neutral', marker:'[data-testid="urai-shadow-spatial-realm"]', device:'mobile' },
  { id:'SHADOW-009', system:'Shadow', state:'semantic-fallback', route:'/shadow', text:'Three-dimensional rendering is unavailable on this device.', noWebGL:true },

  { id:'LEGACY-OVERVIEW-DESKTOP', system:'Legacy', state:'entry-establishing', route:'/legacy', marker:'[data-testid="urai-legacy-archive-world"]' },
  { id:'LEGACY-OVERVIEW-MOBILE', system:'Legacy', state:'mobile', route:'/legacy', marker:'[data-testid="urai-legacy-archive-world"]', device:'mobile' },
  { id:'LEGACY-REDUCED-MOTION', system:'Legacy', state:'reduced-motion', route:'/legacy', marker:'[data-testid="urai-legacy-archive-world"]', reducedMotion:true },

  { id:'COUNCIL-OVERVIEW-DESKTOP', system:'Council', state:'chamber-overview', route:'/council', text:'URAI Council' },
  { id:'COUNCIL-OVERVIEW-MOBILE', system:'Council', state:'mobile', route:'/council', text:'URAI Council', device:'mobile' },
  { id:'COUNCIL-REDUCED-MOTION', system:'Council', state:'reduced-motion', route:'/council', text:'URAI Council', reducedMotion:true },

  { id:'FUTURES-EMPTY-DESKTOP', system:'Possible Futures', state:'empty-manual-entry', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]' },
  { id:'FUTURES-EMPTY-MOBILE', system:'Possible Futures', state:'mobile-empty', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]', device:'mobile' },
  { id:'FUTURES-REDUCED-MOTION', system:'Possible Futures', state:'reduced-motion', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]', reducedMotion:true },
  { id:'FUTURES-PROVIDER-UNAVAILABLE', system:'Possible Futures', state:'provider-unavailable-disclosure', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]', text:'provider is unavailable' },
  { id:'FUTURES-NOWEBGL', system:'Possible Futures', state:'no-webgl-conventional-fallback', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]', noWebGL:true },

  { id:'ONBOARDING-DESKTOP', system:'Onboarding', state:'first-run', route:'/onboarding' },
  { id:'ONBOARDING-MOBILE', system:'Onboarding', state:'first-run-mobile', route:'/onboarding', device:'mobile' },
  { id:'SETTINGS-PRIVACY-DESKTOP', system:'Privacy', state:'settings-privacy', route:'/settings/privacy' },
  { id:'SETTINGS-PRIVACY-MOBILE', system:'Privacy', state:'settings-privacy-mobile', route:'/settings/privacy', device:'mobile' },
]

const selectedStates = [
  {
    id:'MIRROR-SELECTED-RHYTHM-DESKTOP', system:'Mirror', state:'selected-body-rhythm', route:'/mirror?memoryId=demo%3Aquiet-reset&demo=1',
    marker:'[data-testid="mirror-spatial-world"]',
    action: async (page) => {
      const button = page.getByRole('button', { name: /^Rhythm/ }).first()
      if (await button.count()) await button.click()
      await page.locator('aside[aria-label="Body rhythm evidence"]').first().waitFor({ state:'visible', timeout:30000 })
    }
  },
  {
    id:'MIRROR-SELECTED-RHYTHM-MOBILE', system:'Mirror', state:'selected-body-rhythm-mobile', route:'/mirror?memoryId=demo%3Aquiet-reset&demo=1',
    marker:'[data-testid="mirror-spatial-world"]', device:'mobile',
    action: async (page) => {
      const button = page.getByRole('button', { name: /^Rhythm/ }).first()
      if (await button.count()) await button.click()
      await page.locator('aside[aria-label="Body rhythm evidence"]').first().waitFor({ state:'visible', timeout:30000 })
    }
  },
  {
    id:'PASSPORT-PROVENANCE-DESKTOP', system:'Passport UI', state:'provenance-selected', route:'/passport?demo=1', text:'DEMONSTRATION — sample data only',
    action: async (page) => {
      const b = page.getByRole('button', { name:'Provenance archive' }).first()
      if (await b.count()) await b.click()
    }
  },
  {
    id:'PRIVACY-IDENTITY-DESKTOP', system:'Privacy', state:'identity-domain', route:'/privacy-controls?demo=1', text:'DEMONSTRATION — no personal data',
    action: async (page) => {
      const b = page.getByRole('button', { name:/Identity/i }).first()
      if (await b.count()) await b.click()
    }
  },
  {
    id:'FUTURES-ONE-BRANCH', system:'Possible Futures', state:'one-valid-branch', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]',
    action: async (page) => {
      await page.getByPlaceholder('What if I change…').fill('Explore a disclosed hypothetical change')
      const drafts = page.getByPlaceholder('Your assumption or possible branch')
      await drafts.nth(0).fill('Hypothetical branch A')
      await page.getByRole('button', { name:'Enter Manual Scenario' }).click()
      await page.getByText('SCENARIO · UNRANKED', { exact:false }).first().waitFor({ state:'visible' })
    }
  },
  {
    id:'FUTURES-THREE-BRANCHES', system:'Possible Futures', state:'three-unranked-branches', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]',
    action: async (page) => {
      await page.getByPlaceholder('What if I change…').fill('Explore disclosed hypothetical alternatives')
      const drafts = page.getByPlaceholder('Your assumption or possible branch')
      await drafts.nth(0).fill('Hypothetical branch A')
      await drafts.nth(1).fill('Hypothetical branch B')
      await drafts.nth(2).fill('Hypothetical branch C')
      await page.getByRole('button', { name:'Enter Manual Scenario' }).click()
      await page.getByRole('group', { name:'Unranked scenario branches' }).waitFor({ state:'visible' })
    }
  },
  {
    id:'FUTURES-ACTIVE-A', system:'Possible Futures', state:'active-branch-a', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]',
    action: async (page) => {
      await page.getByPlaceholder('What if I change…').fill('Explore disclosed hypothetical alternatives')
      const drafts = page.getByPlaceholder('Your assumption or possible branch')
      await drafts.nth(0).fill('Hypothetical branch A')
      await drafts.nth(1).fill('Hypothetical branch B')
      await drafts.nth(2).fill('Hypothetical branch C')
      await page.getByRole('button', { name:'Enter Manual Scenario' }).click()
      await page.getByRole('button', { name:'Current path' }).waitFor({ state:'visible' })
    }
  },
  {
    id:'FUTURES-ACTIVE-B', system:'Possible Futures', state:'active-branch-b', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]',
    action: async (page) => {
      await page.getByPlaceholder('What if I change…').fill('Explore disclosed hypothetical alternatives')
      const drafts = page.getByPlaceholder('Your assumption or possible branch')
      await drafts.nth(0).fill('Hypothetical branch A')
      await drafts.nth(1).fill('Hypothetical branch B')
      await drafts.nth(2).fill('Hypothetical branch C')
      await page.getByRole('button', { name:'Enter Manual Scenario' }).click()
      await page.getByRole('button', { name:'Requested change' }).click()
    }
  },
  {
    id:'FUTURES-EDIT-ASSUMPTIONS', system:'Possible Futures', state:'edit-assumptions', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]',
    action: async (page) => {
      await page.getByPlaceholder('What if I change…').fill('Explore a disclosed hypothetical change')
      const drafts = page.getByPlaceholder('Your assumption or possible branch')
      await drafts.nth(0).fill('Hypothetical branch A')
      await page.getByRole('button', { name:'Enter Manual Scenario' }).click()
      await page.getByRole('button', { name:'Edit assumptions' }).click()
      await page.getByRole('heading', { name:'Manual Scenario' }).waitFor({ state:'visible' })
    }
  },
  {
    id:'FUTURES-THREE-BRANCHES-MOBILE', system:'Possible Futures', state:'three-unranked-mobile', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]', device:'mobile',
    action: async (page) => {
      await page.getByPlaceholder('What if I change…').fill('Explore disclosed hypothetical alternatives')
      const drafts = page.getByPlaceholder('Your assumption or possible branch')
      await drafts.nth(0).fill('Hypothetical branch A')
      await drafts.nth(1).fill('Hypothetical branch B')
      await drafts.nth(2).fill('Hypothetical branch C')
      await page.getByRole('button', { name:'Enter Manual Scenario' }).click()
    }
  },
]

const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl'] })
try {
  for (const cfg of [...simple, ...selectedStates]) await capture(browser, cfg)
} finally {
  await browser.close()
}

receipt.completedAt = new Date().toISOString()
receipt.status = receipt.failures.length ? 'partial' : 'captured'
await fs.writeFile(path.join(outDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify({ exactSha, captures:receipt.captures.length, failures:receipt.failures.length, status:receipt.status }))
if (!receipt.captures.length) process.exitCode = 1
