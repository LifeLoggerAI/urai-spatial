import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.URAI_AUDIT_BASE_URL || 'https://urai.app'
const outDir = process.env.URAI_AUDIT_OUT_DIR || 'live-visual-audit'
const shotDir = path.join(outDir, 'screenshots')

const routes = [
  {
    name: 'root',
    route: '/',
    markers: ['Own your life', 'Step inside yourself'],
    visualPrompt: 'Home should feel like a threshold world: sky above, ground below, orb/body/portals visible, not a generic landing page.',
  },
  {
    name: 'home',
    route: '/home',
    markers: ['Own your life', 'Step inside yourself'],
    visualPrompt: 'Home should feel cinematic with clear sky-to-Life-Map and ground-to-Ground affordances.',
  },
  {
    name: 'ground',
    route: '/ground',
    markers: ['Your real life has a place', 'private operating world'],
    visualPrompt: 'Ground should read as a private operating world with zones, helpers, objects, and inspectable life surfaces.',
  },
  {
    name: 'life-map',
    route: '/life-map',
    markers: ['Life Map', 'Wheel', 'Drag', 'memory star'],
    visualPrompt: 'Life Map should feel like a private galaxy with depth/parallax, not a flat dashboard or wallpaper.',
  },
  {
    name: 'focus-quiet-reset',
    route: '/focus?memoryId=quiet-reset',
    markers: ['The Quiet Reset', 'Selected memory camera chamber', 'Replay'],
    visualPrompt: 'Focus should feel like one selected memory camera chamber with one obvious Replay doorway.',
  },
  {
    name: 'replay-recovery-thread',
    route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
    markers: ['Replay the thread', 'Film beats'],
    visualPrompt: 'Replay should feel like a cinematic memory-film space, not a static poster.',
  },
  {
    name: 'mirror',
    route: '/mirror',
    markers: ['See the pattern clearly', 'Reflection stack', 'Mirror'],
    visualPrompt: 'Mirror should feel like a reflection realm with orb/pattern intelligence, not a normal content page.',
  },
  {
    name: 'passport',
    route: '/passport',
    markers: ['Your life stays yours', 'Vault layers', 'Passport'],
    visualPrompt: 'Passport should feel like a premium identity, consent, provenance, and ownership vault.',
  },
  {
    name: 'status',
    route: '/status',
    markers: ['World online', 'Route matrix', 'Tracked'],
    visualPrompt: 'Status should feel like a live control room / launch proof room, not a plain status table.',
  },
  {
    name: 'privacy-controls',
    route: '/privacy-controls',
    markers: ['Choose what the world can hold', 'Privacy Controls', 'Private by default'],
    staleMarkers: ['Home threshold', 'Click the sky', 'Click the ground'],
    visualPrompt: 'Privacy Controls should be its own premium consent control room. It must not render Home threshold content.',
  },
  {
    name: 'location-map',
    route: '/location-map',
    markers: ['Emotional weather over private places', 'symbolic atlas'],
    visualPrompt: 'Location Map should feel like a symbolic emotional atlas/place layer, not a bare list.',
  },
  {
    name: 'spatial-ar-vr',
    route: '/spatial/ar-vr',
    markers: ['Step inside the Life Map', 'Quest', 'manual'],
    visualPrompt: 'XR portal should honestly show Quest/WebXR capability and manual-device-required proof steps.',
  },
  {
    name: 'demo',
    route: '/demo',
    markers: ['URAI'],
    visualPrompt: 'Demo should feel like a public walkthrough, not a placeholder route.',
  },
  {
    name: 'demo-replay-film',
    route: '/demo/replay-film',
    markers: ['Replay'],
    visualPrompt: 'Replay film demo should feel like a launch-film proof surface with clear sequence and CTA.',
  },
]

const devices = [
  {
    name: 'desktop',
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
]

const interactionChecks = [
  {
    name: 'home-to-life-map',
    start: '/home',
    selectors: [
      'a[data-urai-audit-action="home-life-map"]',
      'a[data-urai-audit-action="open-life-map"]',
      'a[href="/life-map"]',
      'a[href*="/life-map"]',
      'button:has-text("Life Map")',
      'button:has-text("Open My World")',
    ],
    expected: '/life-map',
  },
  {
    name: 'home-to-ground',
    start: '/home',
    selectors: [
      'a[data-urai-audit-action="home-ground"]',
      'a[data-urai-audit-action="open-ground"]',
      'a[href="/ground"]',
      'a[href*="/ground"]',
      'button:has-text("Ground")',
    ],
    expected: '/ground',
  },
  {
    name: 'life-map-to-focus',
    start: '/life-map',
    selectors: [
      'a[data-urai-audit-action="life-map-focus"]',
      'a[data-urai-audit-action="open-focus"]',
      'a[href*="/focus"]',
      'button:has-text("Focus")',
      'button:has-text("Open selected memory")',
      'button:has-text("Open")',
    ],
    expected: '/focus',
  },
  {
    name: 'focus-to-replay',
    start: '/focus?memoryId=quiet-reset',
    selectors: [
      'a[data-urai-audit-action="focus-replay"]',
      'a[data-urai-audit-action="open-replay"]',
      'a[href*="/replay"]',
      'button:has-text("Replay")',
      'button:has-text("Start Replay")',
    ],
    expected: '/replay',
  },
  {
    name: 'passport-to-status',
    start: '/passport',
    selectors: [
      'a[data-urai-audit-action="open-status"]',
      'a[href="/status"]',
      'a:has-text("Status")',
      'button:has-text("Status")',
    ],
    expected: '/status',
  },
]

function absolute(route) {
  return new URL(route, baseUrl).toString()
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function markerResults(text, markers = []) {
  const haystack = normalizeText(text).toLowerCase()
  return markers.map((marker) => ({ marker, present: haystack.includes(String(marker).toLowerCase()) }))
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const candidates = page.locator(selector)
    const count = await candidates.count().catch(() => 0)
    for (let index = 0; index < count; index += 1) {
      const locator = candidates.nth(index)
      const visible = await locator.isVisible({ timeout: 1200 }).catch(() => false)
      if (visible) return { locator, selector }
    }
  }
  return null
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(1400)
}

async function clickOrFollowHref(page, locator) {
  try {
    await locator.click({ timeout: 10000 })
    await page.waitForTimeout(1500)
    return { mode: 'native-click', error: '' }
  } catch (clickError) {
    const href = await locator.getAttribute('href').catch(() => '')
    if (href) {
      const target = new URL(href, page.url()).toString()
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await settle(page)
      return { mode: 'href-fallback', error: `native click failed, followed href instead: ${String(clickError?.message || clickError).split('\n')[0]}` }
    }
    throw clickError
  }
}

async function captureRoute({ browser, routeConfig, device }) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
    userAgent: device.userAgent,
  })

  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  const url = absolute(routeConfig.route)
  const startedAt = Date.now()
  let status = 'unknown'
  let error = ''
  let finalUrl = url

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    status = response ? response.status() : 'unknown'
    await settle(page)
    finalUrl = page.url()
  } catch (caught) {
    error = String(caught?.message || caught)
  }

  const title = await page.title().catch(() => '')
  const text = await page.locator('body').innerText({ timeout: 7000 }).catch(() => '')
  const links = await page
    .locator('a, button')
    .evaluateAll((elements) =>
      elements.slice(0, 140).map((element) => ({
        tag: element.tagName.toLowerCase(),
        text: (element.innerText || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
        href: element.getAttribute('href') || '',
      })),
    )
    .catch(() => [])

  const screenshotRelative = path.join('screenshots', `${device.name}-${routeConfig.name}.png`)
  const screenshot = path.join(outDir, screenshotRelative)
  await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' }).catch((caught) => {
    error = `${error} screenshot:${String(caught?.message || caught)}`.trim()
  })

  await context.close()

  const markers = markerResults(text, routeConfig.markers)
  const staleMarkers = markerResults(text, routeConfig.staleMarkers)
  const missingMarkers = markers.filter((item) => !item.present).map((item) => item.marker)
  const presentStaleMarkers = staleMarkers.filter((item) => item.present).map((item) => item.marker)

  return {
    name: routeConfig.name,
    route: routeConfig.route,
    url,
    finalUrl,
    device: device.name,
    viewport: device.viewport,
    status,
    ms: Date.now() - startedAt,
    title,
    markerStatus: missingMarkers.length === 0 ? 'pass' : 'missing-marker',
    staleStatus: presentStaleMarkers.length === 0 ? 'pass' : 'stale-content',
    missingMarkers,
    presentStaleMarkers,
    linkCount: links.length,
    links,
    screenshot: screenshotRelative,
    visualPrompt: routeConfig.visualPrompt,
    error,
    textSample: text.slice(0, 1400),
  }
}

async function captureInteraction({ browser, check, device }) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
    userAgent: device.userAgent,
  })

  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  const startUrl = absolute(check.start)
  const startedAt = Date.now()
  let error = ''
  let currentUrl = ''
  let selector = ''
  let ok = false
  let mode = ''
  const screenshotRelative = path.join('screenshots', `interaction-${device.name}-${check.name}.png`)
  const screenshot = path.join(outDir, screenshotRelative)

  try {
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await settle(page)
    const found = await firstVisible(page, check.selectors)
    if (!found) {
      error = `visible selector not found: ${check.selectors.join(' | ')}`
    } else {
      selector = found.selector
      await found.locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
      const action = await clickOrFollowHref(page, found.locator)
      mode = action.mode
      error = action.error
      currentUrl = page.url()
      ok = currentUrl.includes(check.expected)
      await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' }).catch(() => {})
    }
  } catch (caught) {
    error = String(caught?.message || caught)
  }

  await context.close()

  return {
    name: check.name,
    device: device.name,
    ok,
    startUrl,
    expected: check.expected,
    currentUrl,
    selector,
    mode,
    ms: Date.now() - startedAt,
    screenshot: screenshotRelative,
    error,
  }
}

async function main() {
  await fs.mkdir(shotDir, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  const routeResults = []

  for (const routeConfig of routes) {
    for (const device of devices) {
      const result = await captureRoute({ browser, routeConfig, device })
      routeResults.push(result)
      console.log(
        `AUDIT ${result.device} ${result.name}: status=${result.status} markers=${result.markerStatus} stale=${result.staleStatus} screenshot=${result.screenshot}${result.error ? ` error=${result.error}` : ''}`,
      )
    }
  }

  const interactions = []
  for (const check of interactionChecks) {
    for (const device of devices) {
      const result = await captureInteraction({ browser, check, device })
      interactions.push(result)
      console.log(
        `INTERACTION ${result.device} ${result.name}: ok=${result.ok} mode=${result.mode || 'none'} selector=${result.selector || 'none'} current=${result.currentUrl || 'none'}${result.error ? ` note=${result.error}` : ''}`,
      )
    }
  }

  await browser.close()

  const failedRoutes = routeResults.filter((result) => result.status !== 200 || result.error)
  const missingMarkerRoutes = routeResults.filter((result) => result.missingMarkers.length > 0)
  const staleContentRoutes = routeResults.filter((result) => result.presentStaleMarkers.length > 0)
  const failedInteractions = interactions.filter((result) => !result.ok)

  const summary = {
    routeCount: routes.length,
    deviceCount: devices.length,
    screenshotCount: routeResults.filter((result) => result.screenshot).length,
    expectedScreenshotCount: routes.length * devices.length,
    failedRoutes: failedRoutes.map((result) => ({ route: result.route, device: result.device, status: result.status, error: result.error })),
    missingMarkerRoutes: missingMarkerRoutes.map((result) => ({ route: result.route, device: result.device, missingMarkers: result.missingMarkers })),
    staleContentRoutes: staleContentRoutes.map((result) => ({ route: result.route, device: result.device, staleMarkers: result.presentStaleMarkers })),
    failedInteractions,
    interactionModes: interactions.map((item) => ({ name: item.name, device: item.device, ok: item.ok, mode: item.mode || 'none', note: item.error || '' })),
  }

  const payload = {
    createdAt: new Date().toISOString(),
    baseUrl,
    devices,
    routes: routeResults,
    interactions,
    summary,
  }

  await fs.writeFile(path.join(outDir, 'visual-audit.json'), JSON.stringify(payload, null, 2))
  await fs.writeFile(path.join(outDir, 'latest-screenshots.txt'), routeResults.map((result) => result.screenshot).join('\n') + '\n')
  await fs.writeFile(
    path.join(outDir, 'visual-audit-summary.md'),
    [
      '# URAI live visual audit',
      '',
      `Base URL: ${baseUrl}`,
      `Created: ${payload.createdAt}`,
      '',
      '## Summary',
      '',
      `- Routes audited: ${summary.routeCount}`,
      `- Devices audited: ${summary.deviceCount}`,
      `- Screenshots captured: ${summary.screenshotCount}/${summary.expectedScreenshotCount}`,
      `- Failed routes: ${summary.failedRoutes.length}`,
      `- Missing marker route/device pairs: ${summary.missingMarkerRoutes.length}`,
      `- Stale-content route/device pairs: ${summary.staleContentRoutes.length}`,
      `- Failed interactions: ${summary.failedInteractions.length}`,
      '',
      '## Human visual judgment checklist',
      '',
      ...routes.map((route) => `- ${route.route}: ${route.visualPrompt}`),
      '',
      '## Route results',
      '',
      ...routeResults.map(
        (result) =>
          `- ${result.device} ${result.route}: status=${result.status}; markers=${result.markerStatus}; stale=${result.staleStatus}; screenshot=${result.screenshot}${result.error ? `; error=${result.error}` : ''}`,
      ),
      '',
      '## Interactions',
      '',
      ...interactions.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} ${item.device} ${item.name}: mode=${item.mode || 'none'}; ${item.currentUrl || item.error || 'no result'}`),
      '',
      '## XR hardware boundary',
      '',
      'This audit proves desktop/mobile browser render and route navigation only. Physical Quest Browser proof remains manual and cannot be inferred from this script.',
      '',
    ].join('\n'),
  )

  if (failedRoutes.length > 0 || missingMarkerRoutes.length > 0 || staleContentRoutes.length > 0 || failedInteractions.length > 0) {
    console.error('LIVE_VISUAL_AUDIT_FAILED')
    console.error(JSON.stringify(summary, null, 2))
    process.exitCode = 1
  } else {
    console.log('LIVE_VISUAL_AUDIT_PASSED')
    console.log(JSON.stringify(summary, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
