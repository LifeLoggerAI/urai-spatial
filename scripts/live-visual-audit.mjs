import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.URAI_AUDIT_BASE_URL || 'https://urai.app'
const outDir = process.env.URAI_AUDIT_OUT_DIR || 'live-visual-audit'
const shotDir = path.join(outDir, 'screenshots')

// Fresh persisted report trigger: 2026-06-21T1800Z.
const routes = [
  ['tier1-root', '/'],
  ['tier1-home', '/home'],
  ['tier1-spatial', '/spatial'],
  ['tier2-life-map', '/life-map'],
  ['tier2-life-map-blue-fog', '/life-map?star=blue-fog'],
  ['tier2-focus', '/focus?memoryId=quiet-reset'],
  ['tier2-replay', '/replay?manifestId=replay-recovery-thread'],
  ['tier3-mirror', '/mirror'],
  ['passport', '/passport'],
  ['status', '/status'],
  ['privacy-controls', '/privacy-controls'],
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

async function main() {
  await fs.mkdir(shotDir, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })

  const routeResults = []

  for (const [name, route] of routes) {
    const url = absolute(route)
    const startedAt = Date.now()
    let status = 'unknown'
    let error = ''

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
      status = response ? response.status() : 'unknown'
      await page.waitForTimeout(1800)
    } catch (caught) {
      error = String(caught?.message || caught)
    }

    const title = await page.title().catch(() => '')
    const text = await page.locator('body').innerText({ timeout: 7000 }).catch(() => '')
    const links = await page.locator('a, button').evaluateAll((elements) =>
      elements.slice(0, 120).map((element) => ({
        tag: element.tagName.toLowerCase(),
        text: (element.innerText || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
        href: element.getAttribute('href') || '',
      })),
    ).catch(() => [])

    const screenshot = path.join(shotDir, `${name}.png`)
    await page.screenshot({ path: screenshot, fullPage: true }).catch((caught) => {
      error = `${error} screenshot:${String(caught?.message || caught)}`.trim()
    })

    const result = {
      name,
      route,
      url,
      status,
      ms: Date.now() - startedAt,
      title,
      oldDemoCopyPresent: /Private Field|tap the sky|quiet blue weather/i.test(text),
      productionCopyPresent: /Production live surface|Tier One|Tier Two|Tier Three|Life Map|Focus|Replay|Mirror|Passport|Status|Routes wired|Own your life|Step inside yourself|URAI Passport Controls/i.test(text),
      linkCount: links.length,
      links,
      screenshot,
      error,
      textSample: text.slice(0, 1200),
    }

    routeResults.push(result)
    console.log(`AUDIT ${name}: status=${status} links=${links.length} oldDemo=${result.oldDemoCopyPresent} production=${result.productionCopyPresent} screenshot=${screenshot}`)
  }

  const interactions = []

  for (const check of interactionChecks) {
    const startUrl = absolute(check.start)
    const startedAt = Date.now()
    let error = ''
    let currentUrl = ''
    let selector = ''
    let ok = false
    const screenshot = path.join(shotDir, `interaction-${check.name}.png`)

    try {
      await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(2000)
      const found = await firstVisible(page, check.selectors)
      if (!found) {
        error = `visible selector not found: ${check.selectors.join(' | ')}`
      } else {
        selector = found.selector
        await found.locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
        await found.locator.click({ timeout: 10000 })
        await page.waitForTimeout(1400)
        currentUrl = page.url()
        ok = currentUrl.includes(check.expected)
        await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {})
      }
    } catch (caught) {
      error = String(caught?.message || caught)
    }

    interactions.push({
      name: check.name,
      ok,
      startUrl,
      expected: check.expected,
      currentUrl,
      selector,
      ms: Date.now() - startedAt,
      screenshot,
      error,
    })

    console.log(`INTERACTION ${check.name}: ok=${ok} selector=${selector || 'none'} current=${currentUrl || 'none'}`)
  }

  await browser.close()

  const summary = {
    routeCount: routeResults.length,
    screenshotCount: routeResults.filter((result) => result.screenshot).length,
    oldDemoCopyRoutes: routeResults.filter((result) => result.oldDemoCopyPresent).map((result) => result.route),
    productionCopyRoutes: routeResults.filter((result) => result.productionCopyPresent).map((result) => result.route),
    failedRoutes: routeResults.filter((result) => result.status !== 200 || result.error).map((result) => ({ route: result.route, status: result.status, error: result.error })),
    failedInteractions: interactions.filter((result) => !result.ok),
  }

  const payload = {
    createdAt: new Date().toISOString(),
    baseUrl,
    routes: routeResults,
    interactions,
    summary,
  }

  await fs.writeFile(path.join(outDir, 'visual-audit.json'), JSON.stringify(payload, null, 2))
  await fs.writeFile(path.join(outDir, 'visual-audit-summary.md'), [
    '# URAI live visual audit',
    '',
    `Base URL: ${baseUrl}`,
    `Created: ${payload.createdAt}`,
    '',
    '## Summary',
    '',
    `- Routes audited: ${summary.routeCount}`,
    `- Screenshots expected: ${summary.screenshotCount}`,
    `- Old demo copy routes: ${summary.oldDemoCopyRoutes.length ? summary.oldDemoCopyRoutes.join(', ') : 'none'}`,
    `- Production copy routes: ${summary.productionCopyRoutes.length ? summary.productionCopyRoutes.join(', ') : 'none'}`,
    `- Failed interactions: ${summary.failedInteractions.length}`,
    '',
    '## Interactions',
    '',
    ...interactions.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} ${item.name}: ${item.currentUrl || item.error || 'no result'}`),
    '',
  ].join('\n'))

  if (summary.oldDemoCopyRoutes.length > 0 || summary.failedRoutes.length > 0 || summary.failedInteractions.length > 0) {
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
