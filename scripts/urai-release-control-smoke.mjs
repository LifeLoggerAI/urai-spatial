import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import {
  restoreDiscoveredVersion,
  verifyRestoredVersion,
} from './firebase-hosting-recovery.mjs'

const requireFromTarget = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = requireFromTarget('playwright')
const out = 'release-control-evidence'
const canonicalWorkflow = 'URAI Canonical Production Release'
const canonicalRepository = 'LifeLoggerAI/urai-spatial'
const managedCredentialFilename = 'urai-firebase-service-account.json'

function protectedDeployRecoveryContext() {
  return process.env.GITHUB_ACTIONS === 'true'
    && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && process.env.GITHUB_WORKFLOW === canonicalWorkflow
    && process.env.GITHUB_REPOSITORY === canonicalRepository
    && process.env.GITHUB_REF === 'refs/heads/main'
    && process.env.GITHUB_JOB === 'deploy'
    && ['deploy', 'rollback'].includes(process.env.URAI_RELEASE_OPERATION || '')
}

function configureRecoveryEnvironment() {
  const runnerTemp = String(process.env.RUNNER_TEMP || '').trim()
  if (!runnerTemp) throw new Error('RUNNER_TEMP is required for strict-smoke Hosting recovery')
  process.env.FIREBASE_SITE_ID = 'urai-4dc1d'
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(runnerTemp, managedCredentialFilename)
  process.env.URAI_HOSTING_RECOVERY_RECEIPT = path.join(runnerTemp, 'hosting-recovery', 'legacy-live-release.json')
  process.env.URAI_HOSTING_RESTORE_CONFIRM = 'RESTORE_EXACT_HOSTING_VERSION'
  return runnerTemp
}

function clearRecoveryEnvironment() {
  delete process.env.FIREBASE_SITE_ID
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  delete process.env.URAI_HOSTING_RECOVERY_RECEIPT
  delete process.env.URAI_HOSTING_RESTORE_CONFIRM
}

function copyRecoveryEvidence(runnerTemp) {
  const source = path.join(runnerTemp, 'hosting-recovery')
  if (!existsSync(source)) return null
  const destination = path.join(out, 'hosting-recovery')
  rmSync(destination, { recursive: true, force: true })
  mkdirSync(path.dirname(destination), { recursive: true })
  cpSync(source, destination, { recursive: true, dereference: false, errorOnExist: true, force: false })
  return destination
}

async function recoverAfterStrictSmokeFailure(originalError) {
  if (!protectedDeployRecoveryContext()) throw originalError

  mkdirSync(out, { recursive: true })
  const runnerTemp = configureRecoveryEnvironment()
  let restoreError = null
  let verification = null
  try {
    await restoreDiscoveredVersion()
    verification = await verifyRestoredVersion()
  } catch (error) {
    restoreError = error
  } finally {
    copyRecoveryEvidence(runnerTemp)
    clearRecoveryEnvironment()
  }

  const receipt = {
    schemaVersion: 'urai-strict-smoke-hosting-recovery-1',
    recordedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || canonicalRepository,
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    authoritySha: process.env.CURRENT_MAIN_SHA || process.env.GITHUB_SHA || null,
    targetSha: process.env.URAI_EXPECTED_DEPLOYED_SHA || null,
    rollbackSha: process.env.URAI_EXPECTED_ROLLBACK_SHA || null,
    releaseOperation: process.env.URAI_RELEASE_OPERATION || null,
    originalSmokeError: String(originalError?.stack || originalError),
    restoreSucceeded: !restoreError,
    restoreVerificationPath: verification?.resultPath || null,
    restoreError: restoreError ? String(restoreError?.stack || restoreError) : null,
  }
  writeFileSync(path.join(out, 'strict-smoke-recovery.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  const targetSha = String(process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
  if (/^[0-9a-f]{40}$/.test(targetSha)) {
    const finalStateDirectory = path.join('deployment-receipt', targetSha)
    mkdirSync(finalStateDirectory, { recursive: true })
    writeFileSync(path.join(finalStateDirectory, 'strict-smoke-final-state.json'), `${JSON.stringify({
      ...receipt,
      finalState: restoreError ? 'recovery-failed' : 'restored-previous-hosting-version',
      expectedRestoredVersionName: verification?.result?.expectedVersionName || null,
      observedRestoredVersionName: verification?.result?.observedVersionName || null,
    }, null, 2)}\n`)
  }

  if (restoreError) {
    throw new AggregateError(
      [originalError, restoreError],
      'URAI strict production smoke failed and exact Firebase Hosting recovery also failed',
    )
  }
  throw new AggregateError(
    [originalError],
    'URAI strict production smoke failed; the exact previously live Firebase Hosting version was restored and verified',
  )
}

function normalizePath(value) {
  return value === '/' ? '/' : value.replace(/\/+$/, '') || '/'
}

function sortedSearchEntries(value) {
  return [...new URL(value).searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
}

async function runReleaseControlSmoke() {
  const base = (process.env.URAI_LIVE_BASE_URL || 'https://urai.app').trim().replace(/\/$/, '')
  const expectedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
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
    schemaVersion: 'urai-release-control-smoke-5',
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
    blockedExternalRequests: [],
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

  function assertExactQueryIdentity(label, requestedUrl, observedUrl) {
    const requestedEntries = sortedSearchEntries(requestedUrl)
    const observedEntries = sortedSearchEntries(observedUrl)
    if (JSON.stringify(observedEntries) !== JSON.stringify(requestedEntries)) {
      throw new Error(`${label} query changed: requested ${JSON.stringify(requestedEntries)}, observed ${JSON.stringify(observedEntries)}`)
    }
  }

  async function request(route, redirect = 'follow') {
  const requestedUrl = new URL(route, `${base}/`).toString()
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(requestedUrl, {
        redirect,
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
        headers: { 'cache-control': 'no-cache', 'user-agent': 'urai-release-control-smoke/5' },
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
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)))
    }
  }
  throw lastError || new Error(`Request failed without an error: ${requestedUrl}`)
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
    assertExactQueryIdentity(`Query route ${check.path}`, response.requestedUrl, observedUrl.toString())
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
      await context.route('**/*', async (route) => {
        const requestEvent = route.request()
        let requested
        try {
          requested = new URL(requestEvent.url())
        } catch {
          report.blockedExternalRequests.push({
            profile: profileName,
            url: requestEvent.url(),
            resourceType: requestEvent.resourceType(),
            reason: 'invalid-url',
          })
          await route.abort('blockedbyclient')
          return
        }
        if (['data:', 'blob:', 'about:'].includes(requested.protocol)) {
          await route.continue()
          return
        }
        if (requested.origin !== canonicalOrigin) {
          report.blockedExternalRequests.push({
            profile: profileName,
            url: requested.toString(),
            resourceType: requestEvent.resourceType(),
            reason: 'cross-origin',
          })
          await route.abort('blockedbyclient')
          return
        }
        await route.continue()
      })
      const page = await context.newPage()
      page.on('pageerror', (error) => {
        report.pageErrors.push({ profile: profileName, url: page.url(), message: String(error?.message || error) })
      })
      page.on('console', (message) => {
        if (message.type() === 'error') {
          report.consoleErrors.push({ profile: profileName, url: page.url(), message: message.text() })
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
  if (report.blockedExternalRequests.length) failures.push(`Blocked cross-origin browser requests: ${report.blockedExternalRequests.map((item) => `${item.profile}:${item.url}`).join(' | ')}`)

  writeFileSync(`${out}/smoke-report.json`, `${JSON.stringify(report, null, 2)}\n`)
  if (failures.length) throw new Error(failures.join(' || '))
  console.log(JSON.stringify(report, null, 2))
}

try {
  await runReleaseControlSmoke()
} catch (error) {
  mkdirSync(out, { recursive: true })
  writeFileSync(path.join(out, 'smoke-failure.json'), `${JSON.stringify({
    schemaVersion: 'urai-release-control-smoke-failure-1',
    recordedAt: new Date().toISOString(),
    error: String(error?.stack || error),
  }, null, 2)}\n`)
  await recoverAfterStrictSmokeFailure(error)
}
