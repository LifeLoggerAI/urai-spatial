import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTarget = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = requireFromTarget('playwright')

const base = process.env.URAI_LIVE_BASE_URL || 'https://urai.app'
const expectedSha = process.env.URAI_EXPECTED_DEPLOYED_SHA || ''
const out = 'release-control-evidence'
mkdirSync(out, { recursive: true })

const routes = ['/', '/home', '/ground', '/life-map', '/focus', '/replay', '/mirror', '/passport', '/privacy-controls', '/location-map', '/status']
const identity = {
  memoryId: 'release-control-memory',
  manifestId: 'release-control-manifest',
  node: 'release-control-node',
}
const requiredQueryTokens = [
  `memoryId=${identity.memoryId}`,
  `manifestId=${identity.manifestId}`,
  `node=${identity.node}`,
]
const report = {
  schemaVersion: 'urai-release-control-smoke-3',
  generatedAt: new Date().toISOString(),
  base,
  expectedSha,
  dependencyRoot: process.cwd(),
  routes: [],
  queryChecks: [],
  hydratedIdentityChecks: [],
  fingerprints: [],
  screenshots: [],
  pageErrors: [],
}

async function request(route, redirect = 'follow') {
  const response = await fetch(`${base}${route}`, { redirect })
  const body = await response.text()
  return { path: route, status: response.status, finalUrl: response.url, body, location: response.headers.get('location') || '' }
}

for (const route of routes) {
  const slash = route === '/' ? '/' : `${route}/`
  const plain = await request(route)
  const trailed = await request(slash)
  if (plain.status !== 200 || trailed.status !== 200) throw new Error(`Route parity failed for ${route}: ${plain.status}/${trailed.status}`)
  if (expectedSha && (!plain.body.includes(expectedSha) || !trailed.body.includes(expectedSha))) throw new Error(`Release SHA missing from ${route}`)
  report.routes.push({ route, plainStatus: plain.status, slashStatus: trailed.status, plainFinalUrl: plain.finalUrl, slashFinalUrl: trailed.finalUrl })
}

const queryCases = [
  {
    name: 'focus',
    path: `/focus?${requiredQueryTokens.join('&')}`,
    required: requiredQueryTokens,
    selector: '[data-testid="urai-final-focus-chamber"]',
  },
  {
    name: 'replay',
    path: `/replay?${requiredQueryTokens.join('&')}`,
    required: requiredQueryTokens,
    selector: '[data-testid="cinematic-replay-client"]',
  },
]

for (const check of queryCases) {
  const response = await request(check.path, 'manual')
  const observed = response.status >= 300 && response.status < 400 ? response.location : response.finalUrl
  for (const token of check.required) {
    if (!observed.includes(token)) throw new Error(`Query preservation failed for ${check.path}: missing ${token} in ${observed}`)
  }
  report.queryChecks.push({ name: check.name, path: check.path, status: response.status, observed })
}

const root = await request('/')
for (const fingerprint of ['LifeLoggerAI/UrAi', 'legacy-urai-production-deploy', 'DEPLOY_LEGACY_URAI']) {
  const present = root.body.includes(fingerprint)
  report.fingerprints.push({ fingerprint, present })
  if (present) throw new Error(`Legacy runtime fingerprint present: ${fingerprint}`)
}

async function verifyHydratedIdentity(page, check, profileName) {
  const surface = page.locator(check.selector)
  await surface.waitFor({ state: 'visible', timeout: 20000 })
  const observed = {
    memoryId: await surface.getAttribute('data-memory-id'),
    manifestId: await surface.getAttribute('data-manifest-id'),
    node: await surface.getAttribute('data-node'),
  }
  for (const [key, expected] of Object.entries(identity)) {
    if (observed[key] !== expected) {
      throw new Error(`${check.name} hydrated identity failed on ${profileName}: ${key}=${observed[key] ?? 'missing'}, expected ${expected}`)
    }
  }
  report.hydratedIdentityChecks.push({ profile: profileName, route: check.name, selector: check.selector, observed, passed: true })
}

const browser = await chromium.launch({ headless: true })
try {
  const profiles = [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]
  for (const profile of profiles) {
    const context = await browser.newContext(profile)
    const page = await context.newPage()
    page.on('pageerror', (error) => {
      report.pageErrors.push({ profile: profile.name, url: page.url(), message: String(error?.message || error) })
    })
    const browserRoutes = ['/', '/life-map', queryCases[0].path, queryCases[1].path, '/privacy-controls', '/status']
    for (const route of browserRoutes) {
      const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      if (!response || response.status() !== 200) throw new Error(`Browser route failed for ${route}: ${response?.status() ?? 'no response'}`)
      await page.locator('body').waitFor({ state: 'visible', timeout: 10000 })
      await page.waitForTimeout(1200)
      const identityCheck = queryCases.find((check) => check.path === route)
      if (identityCheck) {
        for (const token of identityCheck.required) {
          if (!page.url().includes(token)) throw new Error(`Browser query preservation failed for ${route}: missing ${token}`)
        }
        await verifyHydratedIdentity(page, identityCheck, profile.name)
      }
      const filename = `${profile.name}-${route.replace(/[/?=&]+/g, '-').replace(/^-|-$/g, '') || 'root'}.png`
      await page.screenshot({ path: `${out}/${filename}`, fullPage: true, animations: 'disabled' })
      report.screenshots.push(filename)
    }
    await context.close()
  }
} finally {
  await browser.close()
}

if (report.pageErrors.length) {
  writeFileSync(`${out}/smoke-report.json`, `${JSON.stringify(report, null, 2)}\n`)
  throw new Error(`Browser page errors detected: ${report.pageErrors.map((item) => `${item.profile}:${item.message}`).join(' | ')}`)
}

writeFileSync(`${out}/smoke-report.json`, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
