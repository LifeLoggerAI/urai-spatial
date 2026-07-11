import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTarget = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = requireFromTarget('playwright')

const base = (process.env.URAI_LIVE_BASE_URL || 'https://urai.app').trim().replace(/\/$/, '')
const expectedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
const out = 'release-control-evidence'
const parsedBase = new URL(base)
const canonicalOrigin = parsedBase.origin
if (canonicalOrigin !== 'https://urai.app' || parsedBase.pathname !== '/' || parsedBase.search || parsedBase.hash) {
  throw new Error('Release-control smoke is restricted to the canonical https://urai.app origin')
}
if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
  throw new Error('URAI_EXPECTED_DEPLOYED_SHA must be a full lowercase 40-character SHA')
}
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
  schemaVersion: 'urai-release-control-smoke-4',
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
  consoleErrors: [],
  externalRequests: [],
}

function normalizePath(value) {
  return value === '/' ? '/' : value.replace(/\/+$/, '') || '/'
}

function assertCanonicalFinalUrl(label, requestedUrl, finalUrl) {
  const requested = new URL(requestedUrl)
  const final = new URL(finalUrl)
  if (final.origin !== canonicalOrigin) throw new Error(`${label} escaped canonical origin: ${final.toString()}`)
  if (normalizePath(final.pathname) !== normalizePath(requested.pathname)) {
    throw new Error(`${label} path changed: requested ${requested.pathname}, final ${final.pathname}`)
  }
  if (final.search !== requested.search) {
    throw new Error(`${label} query changed: requested ${requested.search}, final ${final.search}`)
  }
}

async function request(route, redirect = 'follow') {
  const requestedUrl = new URL(route, `${base}/`).toString()
  const response = await fetch(requestedUrl, {
    redirect,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    headers: { 'cache-control': 'no-cache', 'user-agent': 'urai-release-control-smoke/4' },
  })
  const body = await response.text()
  return {
    path: route,
    requestedUrl,
    status: response.status,
    finalUrl: response.url,
    body,
    location: response.headers.get('location') || '',
  }
}

for (const route of routes) {
  const slash = route === '/' ? '/' : `${route}/`
  const plain = await request(route)
  const trailed = await request(slash)
  if (plain.status !== 200 || trailed.status !== 200) throw new Error(`Route parity failed for ${route}: ${plain.status}/${trailed.status}`)
  assertCanonicalFinalUrl(`${route} plain route`, plain.requestedUrl, plain.finalUrl)
  assertCanonicalFinalUrl(`${route} trailing route`, trailed.requestedUrl, trailed.finalUrl)
  if (!plain.body.includes(expectedSha) || !trailed.body.includes(expectedSha)) throw new Error(`Release SHA missing from ${route}`)
  report.routes.push({
    route,
    plainStatus: plain.status,
    slashStatus: trailed.status,
    plainRequestedUrl: plain.requestedUrl,
    slashRequestedUrl: trailed.requestedUrl,
    plainFinalUrl: plain.finalUrl,
    slashFinalUrl: trailed.finalUrl,
  })
}

const queryCases = [
  {
    name: 'focus',
    path: `/focus?${requiredQueryTokens.join('&')}`,
    required: identity,
    selector: '[data-testid="urai-final-focus-chamber"]',
  },
  {
    name: 'replay',
    path: `/replay?${requiredQueryTokens.join('&')}`,
    required: identity,
    selector: '[data-testid="cinematic-replay-client"]',
  },
]

for (const check of queryCases) {
  const response = await request(check.path, 'manual')
  const redirecting = response.status >= 300 && response.status < 400
  if (redirecting && !response.location) throw new Error(`Query redirect is missing Location for ${check.path}`)
  if (!redirecting && response.status !== 200) throw new Error(`Query route failed for ${check.path}: HTTP ${response.status}`)
  const observedUrl = redirecting
    ? new URL(response.location, response.requestedUrl)
    : new URL(response.finalUrl)
  if (observedUrl.origin !== canonicalOrigin || normalizePath(observedUrl.pathname) !== normalizePath(new URL(response.requestedUrl).pathname)) {
    throw new Error(`Query route escaped canonical identity for ${check.path}: ${observedUrl.toString()}`)
  }
  for (const [key, expected] of Object.entries(check.required)) {
    if (observedUrl.searchParams.get(key) !== expected) {
      throw new Error(`Query preservation failed for ${check.path}: ${key}=${observedUrl.searchParams.get(key) ?? 'missing'}`)
    }
  }
  report.queryChecks.push({ name: check.name, path: check.path, status: response.status, observed: observedUrl.toString() })
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
    const { name: profileName, ...contextOptions } = profile
    const context = await browser.newContext({ ...contextOptions, serviceWorkers: 'block' })
    const page = await context.newPage()
    page.on('pageerror', (error) => {
      report.pageErrors.push({ profile: profileName, url: page.url(), message: String(error?.message || error) })
    })
    page.on('console', (message) => {
      if (message.type() === 'error') {
        report.consoleErrors.push({ profile: profileName, url: page.url(), message: message.text() })
      }
    })
    page.on('request', (requestEvent) => {
      let requested
      try {
        requested = new URL(requestEvent.url())
      } catch {
        report.externalRequests.push({ profile: profileName, url: requestEvent.url(), resourceType: requestEvent.resourceType(), reason: 'invalid-url' })
        return
      }
      if (['data:', 'blob:', 'about:'].includes(requested.protocol)) return
      if (requested.origin !== canonicalOrigin) {
        report.externalRequests.push({ profile: profileName, url: requested.toString(), resourceType: requestEvent.resourceType(), reason: 'cross-origin' })
      }
    })
    const browserRoutes = ['/', '/life-map', queryCases[0].path, queryCases[1].path, '/privacy-controls', '/status']
    for (const route of browserRoutes) {
      const requestedUrl = new URL(route, `${base}/`).toString()
      const response = await page.goto(requestedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
      if (!response || response.status() !== 200) throw new Error(`Browser route failed for ${route}: ${response?.status() ?? 'no response'}`)
      await page.locator('body').waitFor({ state: 'visible', timeout: 10000 })
      await page.waitForTimeout(1200)
      assertCanonicalFinalUrl(`${profileName} browser route ${route}`, requestedUrl, page.url())
      const identityCheck = queryCases.find((check) => check.path === route)
      if (identityCheck) await verifyHydratedIdentity(page, identityCheck, profileName)
      const html = await page.content()
      if (!html.includes(expectedSha)) throw new Error(`Hydrated browser route ${route} is missing exact release SHA on ${profileName}`)
      const filename = `${profileName}-${route.replace(/[/?=&]+/g, '-').replace(/^-|-$/g, '') || 'root'}.png`
      await page.screenshot({ path: `${out}/${filename}`, fullPage: true, animations: 'disabled' })
      report.screenshots.push(filename)
    }
    await context.close()
  }
} finally {
  await browser.close()
}

const failures = []
if (report.pageErrors.length) failures.push(`Browser page errors: ${report.pageErrors.map((item) => `${item.profile}:${item.message}`).join(' | ')}`)
if (report.consoleErrors.length) failures.push(`Browser console errors: ${report.consoleErrors.map((item) => `${item.profile}:${item.message}`).join(' | ')}`)
if (report.externalRequests.length) failures.push(`Cross-origin browser requests: ${report.externalRequests.map((item) => `${item.profile}:${item.url}`).join(' | ')}`)

writeFileSync(`${out}/smoke-report.json`, `${JSON.stringify(report, null, 2)}\n`)
if (failures.length) throw new Error(failures.join(' || '))
console.log(JSON.stringify(report, null, 2))
