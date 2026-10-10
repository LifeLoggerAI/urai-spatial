import { createCandidateRouteAuthority } from './lib/candidate-route-authority.mjs'
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const baseUrl = String(process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = process.env.URAI_MIRROR_PROOF_OUT_DIR || 'mirror-release-proof'
const candidateAuthority = createCandidateRouteAuthority(baseUrl)
const shotDir = path.join(outDir, 'screenshots')

if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')

const devices = {
  desktop: { viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
}

const demoQuery = 'memoryId=demo%3Aquiet-reset&demo=1'
const cases = []
const errors = []

function absolute(route) {
  return new URL(route, `${baseUrl}/`).toString()
}


function pushCase(name, device, status, details = {}) {
  const record = { name, device, status, ...details }
  cases.push(record)
  if (status !== 'passed') errors.push(`${device}:${name}: ${details.error || 'failed'}`)
  console.log(`MIRROR_PROOF ${status.toUpperCase()} ${device} ${name}${details.error ? ` error=${details.error}` : ''}`)
}

function isUnattributedChromiumResource404(entry) {
  return entry?.source === 'console'
    && entry?.text === 'Failed to load resource: the server responded with a status of 404 ()'
    && !entry?.url
}

async function createPage(browser, deviceName, options = {}) {
  const device = devices[deviceName]
  const context = await browser.newContext({
    ...device,
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  if (options.disableWebGL) {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return original.call(this, type, ...args)
      }
    })
  }

  const consoleErrors = []
  const failedRequests = []
  const httpErrors = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const location = message.location()
    consoleErrors.push({
      source: 'console',
      text: message.text(),
      url: location?.url || null,
      lineNumber: Number.isInteger(location?.lineNumber) ? location.lineNumber : null,
      columnNumber: Number.isInteger(location?.columnNumber) ? location.columnNumber : null,
    })
  })
  page.on('pageerror', (error) => {
    consoleErrors.push({ source: 'pageerror', text: String(error?.message || error), url: null, lineNumber: null, columnNumber: null })
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    const request = response.request()
    httpErrors.push({
      status: response.status(),
      url: response.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    })
  })
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'request failed'
    if (failure.includes('ERR_ABORTED')) return
    failedRequests.push({ method: request.method(), url: request.url(), resourceType: request.resourceType(), failure })
  })

  return { context, page, consoleErrors, failedRequests, httpErrors }
}


async function captureRouteDiagnostics(page, name) {
  const evidence = await page.evaluate(() => {
    function inspect(element) {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return {
        tag: element.tagName, id: element.id, className: element.getAttribute('class'),
        routeOwner: element.getAttribute('data-route-owner'),
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        display: style.display, visibility: style.visibility, contentVisibility: style.contentVisibility,
        position: style.position, transform: style.transform, animation: style.animation,
        opacity: style.opacity, overflow: style.overflow, height: style.height, width: style.width,
        hidden: element.hasAttribute('hidden'), inert: element.hasAttribute('inert'),
        ariaHidden: element.getAttribute('aria-hidden'),
      }
    }
    const owners = [...document.querySelectorAll('main,[data-route-owner]')]
    return {
      url: location.href, readyState: document.readyState,
      root: inspect(document.documentElement), body: inspect(document.body),
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"],style')].map(element => ({
        href: element.getAttribute('href'), precedence: element.getAttribute('data-precedence'),
        text: element.tagName === 'STYLE' ? element.textContent : null,
      })),
      owners: owners.map(owner => {
        const ancestors = []
        for (let parent = owner.parentElement; parent; parent = parent.parentElement) ancestors.push(inspect(parent))
        const children = [...owner.children].map(inspect)
        return { ...inspect(owner), children, nonzeroChildBoxes: children.filter(child => child.box.width > 0 && child.box.height > 0).length, ancestors }
      }),
    }
  })
  const relative = `diagnostics/${name}.json`
  await fs.mkdir(path.join(outDir, 'diagnostics'), { recursive: true })
  await fs.writeFile(path.join(outDir, relative), JSON.stringify(evidence, null, 2))
  return relative
}

async function screenshot(page, name) {
  const relative = path.join('screenshots', `${name}.png`)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.screenshot({ path: path.join(outDir, relative), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 60000 })
  return relative
}

async function waitForWorld(page, route) {
  const response = await page.goto(absolute(route), { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${route}`)
  candidateAuthority.assertExactRoute(page.url(), route)
  const world = page.getByTestId('mirror-spatial-world')
  await world.waitFor({ state: 'visible', timeout: 45000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-mirror-ready') === 'true', null, { timeout: 45000 })
  return world
}

function assertCleanEvidence(consoleErrors, failedRequests, httpErrors) {
  if (httpErrors.length) throw new Error(`HTTP resource errors: ${httpErrors.map((entry) => `${entry.status} ${entry.method} ${entry.url} ${entry.resourceType}`).join(' | ')}`)
  if (failedRequests.length) throw new Error(`failed requests: ${failedRequests.map((entry) => `${entry.method} ${entry.url} ${entry.failure}`).join(' | ')}`)
  const blockingConsoleErrors = consoleErrors.filter((entry) => !isUnattributedChromiumResource404(entry))
  if (blockingConsoleErrors.length) throw new Error(`console errors: ${blockingConsoleErrors.map((entry) => `${entry.text}${entry.url ? ` @ ${entry.url}` : ''}`).join(' | ')}`)
  return consoleErrors.filter(isUnattributedChromiumResource404)
}

function diagnostics(consoleErrors, failedRequests, httpErrors, unattributedConsoleErrors = []) {
  return { consoleErrors, failedRequests, httpErrors, unattributedConsoleErrors }
}

function assertBareEntryGeometry(geometry) {
  if (!Number.isFinite(geometry.sectionScrollHeight) || !Number.isFinite(geometry.sectionClientHeight)) throw new Error('bare Mirror section geometry is unavailable')
  if (geometry.sectionScrollHeight > geometry.sectionClientHeight + 1) {
    throw new Error(`bare Mirror choices are clipped by a nested section scroll surface: ${JSON.stringify(geometry)}`)
  }
  if (!Array.isArray(geometry.choices) || geometry.choices.length !== 3) throw new Error('expected all three bare Mirror entry choices')
  for (const choice of geometry.choices) {
    if (!Number.isFinite(choice.width) || !Number.isFinite(choice.height) || choice.width < 48 || choice.height < 48) throw new Error(`undersized bare Mirror choice: ${JSON.stringify(choice)}`)
    if (choice.insideViewport !== true || choice.insideClippingAncestors !== true || choice.unobstructed !== true) {
      throw new Error(`bare Mirror choice is clipped or obstructed: ${JSON.stringify(choice)}`)
    }
  }
}

async function proveBareEntry(browser, deviceName) {
  const name = 'bare-entry-choices'
  const { context, page, consoleErrors, failedRequests, httpErrors } = await createPage(browser, deviceName)
  let initialScreenshot = ''
  try {
    const response = await page.goto(absolute('/mirror'), { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for bare Mirror`)
    candidateAuthority.assertExactRoute(page.url(), '/mirror')
    const guard = page.getByTestId('mirror-bare-entry')
    await guard.waitFor({ state: 'visible', timeout: 30000 })
    await guard.getByRole('heading', { name: 'Choose what Mirror may open.', exact: true }).waitFor({ state: 'visible' })
    if (await guard.getAttribute('data-demo-disclosure') !== 'required') throw new Error('bare Mirror demo disclosure is missing')
    if (await page.getByTestId('mirror-spatial-world').count()) throw new Error('bare Mirror mounted a memory world without explicit context')
    const choices = guard.getByRole('navigation', { name: 'Mirror entry choices' }).locator('a')
    const expectedHrefs = ['/mirror?memoryId=demo%3Amirror-preview&node=mirror-preview&demo=1', '/passport', '/']
    if (await choices.count() !== expectedHrefs.length) throw new Error('bare Mirror choice count changed')
    for (let index = 0; index < expectedHrefs.length; index += 1) {
      if (await choices.nth(index).getAttribute('href') !== expectedHrefs[index]) throw new Error('bare Mirror choice destination changed')
    }
    const founder = guard.locator('[data-urai-adam-launcher-slot="mirror-entry"] [data-urai-adam-launcher]')
    await founder.waitFor({ state: 'visible', timeout: 30000 })
    initialScreenshot = await screenshot(page, `${deviceName}-bare-entry-initial`)
    await founder.scrollIntoViewIfNeeded()
    const founderGeometry = await founder.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const unobstructed = [0.25, 0.5, 0.75].every((x) => [0.25, 0.5, 0.75].every((y) => {
        const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y)
        return Boolean(hit && (hit === element || element.contains(hit)))
      }))
      return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, position: style.position, transform: style.transform, animationName: style.animationName, insideViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, unobstructed }
    })
    if (!Number.isFinite(founderGeometry.width) || !Number.isFinite(founderGeometry.height) || founderGeometry.width < 48 || founderGeometry.height < 48 || founderGeometry.position !== 'static' || founderGeometry.transform !== 'none' || founderGeometry.animationName !== 'none' || !founderGeometry.insideViewport || !founderGeometry.unobstructed) throw new Error(`bare Mirror Founder control is clipped or obstructed: ${JSON.stringify(founderGeometry)}`)
    await guard.evaluate((element) => { element.scrollTop = element.scrollHeight })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const geometry = await guard.evaluate((element) => {
      const section = element.querySelector('section')
      return {
        shellClientHeight: element.clientHeight, shellScrollHeight: element.scrollHeight, shellScrollTop: element.scrollTop,
        sectionClientHeight: section.clientHeight, sectionScrollHeight: section.scrollHeight,
        choices: [...element.querySelectorAll('nav a')].map((choice) => {
          const rect = choice.getBoundingClientRect()
          let insideClippingAncestors = true
          for (let parent = choice.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent)
            const box = parent.getBoundingClientRect()
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX) && (rect.left < box.left - 1 || rect.right > box.right + 1)) insideClippingAncestors = false
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY) && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1)) insideClippingAncestors = false
          }
          const unobstructed = [0.25, 0.5, 0.75].every((x) => [0.25, 0.5, 0.75].every((y) => {
            const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y)
            return Boolean(hit && (hit === choice || choice.contains(hit)))
          }))
          return {
            label: choice.textContent.trim(), href: choice.getAttribute('href'),
            left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height,
            insideViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
            insideClippingAncestors, unobstructed,
          }
        }),
      }
    })
    assertBareEntryGeometry(geometry)
    await choices.first().focus()
    for (let index = 0; index < expectedHrefs.length; index += 1) {
      if (index > 0) await page.keyboard.press('Tab')
      if (!await choices.nth(index).evaluate((element) => document.activeElement === element)) throw new Error('keyboard focus did not reach a bare Mirror choice in order')
    }
    await guard.evaluate((element) => { element.scrollTop = element.scrollHeight })
    const shot = await screenshot(page, `${deviceName}-bare-entry-choices-reachable`)
    const demoBox = await choices.first().boundingBox()
    if (!demoBox) throw new Error('explicit demo choice has no bounds')
    await page.touchscreen.tap(demoBox.x + demoBox.width / 2, demoBox.y + demoBox.height / 2)
    await page.waitForURL((url) => candidateAuthority.isExactRoute(url.toString(), '/mirror') && url.searchParams.get('memoryId') === 'demo:mirror-preview' && url.searchParams.get('node') === 'mirror-preview' && url.searchParams.get('demo') === '1', { timeout: 30000 })
    const unattributedConsoleErrors = assertCleanEvidence(consoleErrors, failedRequests, httpErrors)
    return { name, device: deviceName, status: 'passed', screenshot: shot, initialScreenshot, geometry, founderGeometry, keyboardChoicesReachable: true, explicitDemoOpenedByTouch: true, personalizedRuntimeVerified: false, finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors, unattributedConsoleErrors) }
  } catch (error) {
    const shot = await screenshot(page, `${deviceName}-bare-entry-choices-failure`).catch(() => '')
    const failure = new Error(`bare Mirror ${deviceName}: ${String(error?.message || error)}`)
    failure.bareEntryEvidence = { name, device: deviceName, status: 'failed', screenshot: shot, initialScreenshot, error: String(error?.message || error), finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors) }
    throw failure
  } finally {
    await context.close()
  }
}

async function proveOverview(browser, deviceName) {
  const name = 'overview-and-inspection'
  const { context, page, consoleErrors, failedRequests, httpErrors } = await createPage(browser, deviceName)
  let bareEntryProof = null
  let narrowBareEntryProof = null
  try {
    bareEntryProof = await proveBareEntry(browser, deviceName === 'mobile' ? 'mobile' : 'landscape')
    if (deviceName === 'mobile') narrowBareEntryProof = await proveBareEntry(browser, 'narrow')
    const world = await waitForWorld(page, `/mirror?${demoQuery}`)
    if (await world.getAttribute('data-demo') !== 'true') throw new Error('demo disclosure missing')
    if (await page.locator('canvas').count() !== 1) throw new Error('canonical canvas missing or duplicated')
    const rail = page.locator('section[aria-label="Reflection patterns"]')
    await rail.waitFor({ state: 'visible' })
    if (await rail.getByRole('button').count() !== 4) throw new Error('expected four reflection patterns')

    const controls = page.locator('button:visible')
    const controlCount = await controls.count()
    for (let index = 0; index < controlCount; index += 1) {
      const box = await controls.nth(index).boundingBox()
      if (box && (box.width < 44 || box.height < 44)) throw new Error(`undersized visible control ${Math.round(box.width)}x${Math.round(box.height)}`)
    }

    const startZ = Number(await world.getAttribute('data-mirror-camera-z'))
    const movementObserved = () => page.waitForFunction(({ startZ, threshold }) => {
      const value = Number(document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-mirror-camera-z'))
      return Number.isFinite(value) && Math.abs(value - startZ) >= threshold
    }, { startZ, threshold: 0.05 }, { timeout: 5000, polling: 50 })
    if (deviceName === 'desktop') {
      await page.keyboard.down('ArrowUp')
      try { await movementObserved() } finally { await page.keyboard.up('ArrowUp') }
    } else {
      const forward = page.getByRole('button', { name: 'Move forward' })
      await forward.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true })
      try { await movementObserved() } finally {
        await forward.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true })
      }
    }
    const movedZ = Number(await world.getAttribute('data-mirror-camera-z'))
    if (!Number.isFinite(startZ) || !Number.isFinite(movedZ) || Math.abs(movedZ - startZ) < 0.05) throw new Error(`embodied movement not observed: ${startZ} -> ${movedZ}`)

    await rail.getByRole('button', { name: /^Rhythm/ }).click()
    await page.waitForFunction(() => document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-selected-pattern') === 'body-rhythm')
    const inspector = page.locator('aside[aria-label="Body rhythm evidence"]')
    await inspector.waitFor({ state: 'visible' })
    const launcher = page.locator('[data-urai-adam-launcher]')
    await launcher.waitFor({ state: 'visible' })
    const launcherClear = await launcher.evaluate((element) => {
      const a = element.getBoundingClientRect()
      const b = document.querySelector('.mirrorInspection').getBoundingClientRect()
      return a.left >= 0 && a.top >= 0 && a.right <= innerWidth && a.bottom <= innerHeight && !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)
    })
    if (!launcherClear) throw new Error('Founder launcher overlaps the evidence inspector or leaves the viewport')
    if (deviceName === 'mobile') {
      const geometry = await inspector.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }))
      if (geometry.scrollHeight <= geometry.clientHeight) throw new Error(`mobile inspector is not scrollable: ${geometry.clientHeight}/${geometry.scrollHeight}`)
      await inspector.evaluate((element) => { element.scrollTop = element.scrollHeight })
      await page.waitForTimeout(100)
      const scrollTop = await inspector.evaluate((element) => element.scrollTop)
      if (scrollTop <= 0) throw new Error('mobile inspector touch-scroll surface did not move')
    }
    if (!new URL(page.url()).searchParams.has('pattern')) throw new Error('selected pattern was not restored into URL state')

    const range = inspector.locator('input[type="range"]')
    const max = Number(await range.getAttribute('max'))
    if (max > 0) {
      await range.fill(String(max))
      const fragmentButtons = inspector.locator('.fragmentList button:not([disabled])')
      if (await fragmentButtons.count()) await fragmentButtons.last().click()
    }

    const reflectionAction = page.getByRole('button', { name: 'Inspect Body rhythm evidence', exact: true })
    if (deviceName === 'desktop') await reflectionAction.click()
    else await reflectionAction.waitFor({ state: 'hidden' })

    candidateAuthority.assertExactRoute(page.url(), '/mirror')
    const shot = await screenshot(page, `${deviceName}-mirror-selected-body-rhythm`)
    candidateAuthority.assertExactRoute(page.url(), '/mirror')
    const unattributedConsoleErrors = assertCleanEvidence(consoleErrors, failedRequests, httpErrors)
    pushCase(name, deviceName, 'passed', { screenshot: shot, bareEntryProof, narrowBareEntryProof, startCameraZ: startZ, finalCameraZ: movedZ, mobileOrbHiddenDuringInspection: deviceName === 'mobile', finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors, unattributedConsoleErrors) })
  } catch (error) {
    const shot = await screenshot(page, `${deviceName}-mirror-overview-failure`).catch(() => '')
    pushCase(name, deviceName, 'failed', { screenshot: shot, bareEntryProof, narrowBareEntryProof: narrowBareEntryProof || (error?.bareEntryEvidence?.device === 'narrow' ? error.bareEntryEvidence : null), bareEntryFailure: error?.bareEntryEvidence || null, error: String(error?.message || error), finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors) })
  } finally {
    await context.close()
  }
}

async function proveState(browser, config) {
  const { name, route, device = 'desktop', reducedMotion = false, disableWebGL = false, afterLoad } = config
  const { context, page, consoleErrors, failedRequests, httpErrors } = await createPage(browser, device, { reducedMotion, disableWebGL })
  try {
    const response = await page.goto(absolute(route), { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${route}`)
  candidateAuthority.assertExactRoute(page.url(), route)
    await page.waitForTimeout(1200)
    if (afterLoad) await afterLoad(page, context)
    const marker = config.marker ? page.locator(config.marker) : page.locator('main')
    await marker.first().waitFor({ state: 'visible', timeout: 30000 })
    if (config.text) await page.getByText(config.text, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 })
    candidateAuthority.assertExactRoute(page.url(), route)
    const shot = await screenshot(page, `${device}-${name}`)
    candidateAuthority.assertExactRoute(page.url(), route)
    const unattributedConsoleErrors = assertCleanEvidence(consoleErrors, failedRequests, httpErrors)
    pushCase(name, device, 'passed', { screenshot: shot, finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors, unattributedConsoleErrors) })
  } catch (error) {
    const shot = await screenshot(page, `${device}-${name}-failure`).catch(() => '')
    pushCase(name, device, 'failed', { screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors) })
  } finally {
    await context.close()
  }
}

async function proveTransition(browser, destination, buttonName) {
  const name = `transition-to-${destination}`
  const { context, page, consoleErrors, failedRequests, httpErrors } = await createPage(browser, 'desktop')
  try {
    await waitForWorld(page, `/mirror?${demoQuery}&pattern=body-rhythm`)
    await page.getByRole('button', { name: buttonName, exact: true }).click()
    await page.waitForURL((url) => candidateAuthority.isExactRoute(url.toString(), `/${destination}`), { timeout: 30000 })
    if (destination === 'replay') {
      await page.getByTestId('urai-replay-surface').waitFor({ state: 'attached', timeout: 45000 })
      const replay = page.locator('[data-testid="cinematic-replay-client"][data-memory-id="demo:quiet-reset"]').first()
      await replay.waitFor({ state: 'attached', timeout: 45000 })
      await page.waitForFunction(() => {
        const replay = document.querySelector('[data-testid="cinematic-replay-client"][data-memory-id="demo:quiet-reset"]')
        return replay?.getAttribute('data-replay-media-ready') === 'true' && replay.getAttribute('data-replay-media-status') === 'ready'
      }, null, { timeout: 45000 })
      const before = Number(await replay.getAttribute('data-current-time-ms'))
      await page.getByRole('button', { name: 'Continue memory', exact: true }).click()
      await page.waitForFunction(before => Number(document.querySelector('[data-testid="cinematic-replay-client"]')?.getAttribute('data-current-time-ms')) > before + 100, before, { timeout: 15000 })
      await page.getByRole('button', { name: 'Pause memory', exact: true }).click()
      if (await replay.getAttribute('data-playing') !== 'false') throw new Error('Replay did not pause after real playback')
    } else if (destination === 'passport') {
      await page.locator('[data-route-owner="passport-ownership-vault"]').waitFor({ state: 'visible' })
      await page.waitForFunction(() => {
        const state = document.querySelector('[data-route-owner="passport-ownership-vault"]')?.getAttribute('data-passport-source')
        return state && state !== 'loading'
      }, null, { timeout: 30000 })
    }
    candidateAuthority.assertExactRoute(page.url(), `/${destination}`)
    const shot = await screenshot(page, `desktop-${name}`)
    candidateAuthority.assertExactRoute(page.url(), `/${destination}`)
    const unattributedConsoleErrors = assertCleanEvidence(consoleErrors, failedRequests, httpErrors)
    pushCase(name, 'desktop', 'passed', { screenshot: shot, destinationSettled: true, replayPlaybackAndPauseVerified: destination === 'replay', personalizedRuntimeVerified: false, finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors, unattributedConsoleErrors) })
  } catch (error) {
    const routeDiagnostics = await captureRouteDiagnostics(page, `desktop-${name}`).catch(() => '')
    const shot = await screenshot(page, `desktop-${name}-failure`).catch(() => '')
    pushCase(name, 'desktop', 'failed', { routeDiagnostics, screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors) })
  } finally {
    await context.close()
  }
}

async function proveSemanticFallback(browser) {
  const name = 'no-webgl-semantic-fallback'
  const { context, page, consoleErrors, failedRequests, httpErrors } = await createPage(browser, 'desktop', { disableWebGL: true })
  try {
    const response = await page.goto(absolute(`/mirror?${demoQuery}`), { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for semantic fallback`)
    const fallback = page.getByTestId('mirror-webgl-fallback')
    await fallback.waitFor({ state: 'visible', timeout: 45000 })
    await fallback.getByRole('button', { name: /^Body rhythm/ }).click()
    const inspector = fallback.locator('article[aria-label="Body rhythm evidence"]')
    await inspector.waitFor({ state: 'visible' })
    await inspector.getByText('Uncertainty', { exact: true }).waitFor({ state: 'visible' })
    await inspector.getByText(/owner-authorized|demonstration data/).waitFor({ state: 'visible' })
    candidateAuthority.assertExactRoute(page.url(), '/mirror')
    const shot = await screenshot(page, 'desktop-no-webgl-semantic-fallback')
    candidateAuthority.assertExactRoute(page.url(), '/mirror')
    const unattributedConsoleErrors = assertCleanEvidence(consoleErrors, failedRequests, httpErrors)
    pushCase(name, 'desktop', 'passed', { screenshot: shot, finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors, unattributedConsoleErrors) })
  } catch (error) {
    const shot = await screenshot(page, 'desktop-no-webgl-semantic-fallback-failure').catch(() => '')
    pushCase(name, 'desktop', 'failed', { screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), ...diagnostics(consoleErrors, failedRequests, httpErrors) })
  } finally {
    await context.close()
  }
}

await fs.mkdir(shotDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-webgl'] })

try {
  await proveOverview(browser, 'desktop')
  await proveOverview(browser, 'mobile')
  await proveState(browser, { name: 'direct-entry-selected', route: `/mirror?${demoQuery}&pattern=emotional-recurrence`, marker: '[data-selected-pattern="emotional-recurrence"]', text: 'Emotional recurrence' })
  await proveState(browser, { name: 'partial-evidence', route: `/mirror?${demoQuery}&mirrorFixture=partial&pattern=body-rhythm`, marker: '[data-selected-pattern="body-rhythm"]', text: 'Limited evidence' })
  await proveState(browser, { name: 'conflicting-evidence', route: `/mirror?${demoQuery}&mirrorFixture=conflicting&pattern=emotional-recurrence`, marker: '[data-selected-pattern="emotional-recurrence"]', text: 'Conflicting evidence' })
  await proveState(browser, { name: 'empty-evidence', route: `/mirror?${demoQuery}&mirrorFixture=empty`, marker: '.mirrorEmpty', text: 'No reflection is available yet.' })
  await proveState(browser, { name: 'permission-denied', route: '/mirror?mirrorFixture=permission-denied', marker: '[data-testid="mirror-spatial-state"]', text: 'Mirror permission is not available.' })
  await proveState(browser, { name: 'failed-source', route: '/mirror?mirrorFixture=failed', marker: '[data-testid="mirror-spatial-state"]', text: 'Mirror could not load the permitted sources.' })
  await proveState(browser, {
    name: 'offline-existing-evidence',
    route: `/mirror?${demoQuery}`,
    marker: '[data-online="false"]',
    text: 'Offline · existing permitted evidence only',
    afterLoad: async (page, context) => {
      await page.getByTestId('mirror-spatial-world').waitFor({ state: 'visible', timeout: 45000 })
      await context.setOffline(true)
      await page.evaluate(() => window.dispatchEvent(new Event('offline')))
      await page.waitForTimeout(500)
    },
  })
  await proveState(browser, { name: 'reduced-motion', route: `/mirror?${demoQuery}`, reducedMotion: true, marker: '[data-testid="mirror-spatial-world"]', text: 'Mirror' })
  await proveSemanticFallback(browser)
  await proveTransition(browser, 'replay', 'Replay threshold')
  await proveTransition(browser, 'passport', 'Passport threshold')
} finally {
  await browser.close()
}

const receipt = {
  schemaVersion: 3,
  exactSha,
  baseUrl,
  createdAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  caseCount: cases.length,
  screenshotCount: cases.filter((item) => item.screenshot).length,
  supportingBareEntryScreenshotCount: cases.reduce((sum, item) => sum + Number(Boolean(item.bareEntryProof?.screenshot)) + Number(Boolean(item.bareEntryProof?.initialScreenshot)) + Number(Boolean(item.narrowBareEntryProof?.screenshot)) + Number(Boolean(item.narrowBareEntryProof?.initialScreenshot)), 0),
  unattributedConsoleErrorCount: cases.reduce((sum, item) => sum + (item.unattributedConsoleErrors?.length || 0), 0),
  cases,
  errors,
}

await fs.writeFile(path.join(outDir, 'mirror-release-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
await fs.writeFile(path.join(outDir, 'mirror-release-summary.md'), [
  '# Mirror exact-head browser release proof',
  '',
  `Exact SHA: ${exactSha}`,
  `Base URL: ${baseUrl}`,
  `Created: ${receipt.createdAt}`,
  `Status: ${receipt.status.toUpperCase()}`,
  `Cases: ${receipt.caseCount}`,
  `Screenshots: ${receipt.screenshotCount}`,
  `Unattributed Chromium resource 404 diagnostics: ${receipt.unattributedConsoleErrorCount}`,
  '',
  ...cases.map((item) => `- ${item.status === 'passed' ? 'PASS' : 'FAIL'} ${item.device} ${item.name}${item.error ? `: ${item.error}` : ''}`),
  '',
].join('\n'))

console.log(errors.length ? 'MIRROR_RELEASE_PROOF_FAILED' : 'MIRROR_RELEASE_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
