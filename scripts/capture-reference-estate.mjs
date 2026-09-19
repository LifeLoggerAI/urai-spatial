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
    await settle(page)

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

const simple = [
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

  { id:'SHADOW-OVERVIEW-DESKTOP', system:'Shadow', state:'neutral-exploration', route:'/shadow', marker:'[data-testid="urai-shadow-route"]' },
  { id:'SHADOW-OVERVIEW-MOBILE', system:'Shadow', state:'mobile', route:'/shadow', marker:'[data-testid="urai-shadow-route"]', device:'mobile' },
  { id:'SHADOW-REDUCED-MOTION', system:'Shadow', state:'reduced-motion', route:'/shadow', marker:'[data-testid="urai-shadow-route"]', reducedMotion:true },
  { id:'SHADOW-NOWEBGL', system:'Shadow', state:'semantic-fallback', route:'/shadow', text:'Three-dimensional rendering is unavailable on this device.', noWebGL:true },

  { id:'LEGACY-OVERVIEW-DESKTOP', system:'Legacy', state:'entry-establishing', route:'/legacy', marker:'[data-testid="urai-legacy-archive-world"]' },
  { id:'LEGACY-OVERVIEW-MOBILE', system:'Legacy', state:'mobile', route:'/legacy', marker:'[data-testid="urai-legacy-archive-world"]', device:'mobile' },
  { id:'LEGACY-REDUCED-MOTION', system:'Legacy', state:'reduced-motion', route:'/legacy', marker:'[data-testid="urai-legacy-archive-world"]', reducedMotion:true },

  { id:'COUNCIL-OVERVIEW-DESKTOP', system:'Council', state:'chamber-overview', route:'/council', text:'URAI Council' },
  { id:'COUNCIL-OVERVIEW-MOBILE', system:'Council', state:'mobile', route:'/council', text:'URAI Council', device:'mobile' },
  { id:'COUNCIL-REDUCED-MOTION', system:'Council', state:'reduced-motion', route:'/council', text:'URAI Council', reducedMotion:true },

  { id:'FUTURES-EMPTY-DESKTOP', system:'Possible Futures', state:'empty-manual-entry', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]' },
  { id:'FUTURES-EMPTY-MOBILE', system:'Possible Futures', state:'mobile-empty', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]', device:'mobile' },
  { id:'FUTURES-REDUCED-MOTION', system:'Possible Futures', state:'reduced-motion', route:'/possible-futures', marker:'[data-testid="urai-possible-futures"]', reducedMotion:true },

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
