import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const evidenceRoot = path.resolve('test-results/public-institutional-surfaces-evidence')

type RuntimeEvidence = {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
}

type Surface = {
  id: string
  route: string
  heading: string
  primaryAction: string
}

const surfaces: Surface[] = [
  { id: 'about', route: '/about/', heading: 'A life you can move through.', primaryAction: 'Enter Life Map' },
  { id: 'contact', route: '/contact/', heading: 'Reach the right door.', primaryAction: 'Product support' },
  { id: 'event', route: '/event/', heading: 'See the system without overstating it.', primaryAction: 'Open demo' },
  { id: 'glass', route: '/glass/', heading: 'Move from screen to space.', primaryAction: 'Open XR preview' },
  { id: 'offline', route: '/offline/', heading: 'Your way back stays visible.', primaryAction: 'Return Home' },
  { id: 'report-bug', route: '/report-bug/', heading: 'Tell us what broke.', primaryAction: 'Email support' },
  { id: 'support', route: '/support/', heading: 'Help when you need it.', primaryAction: 'Email support' },
]

async function observe(page: Page): Promise<RuntimeEvidence> {
  const evidence: RuntimeEvidence = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    evidence.failedRequests.push(
      `${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`,
    )
  })
  return evidence
}

async function save(name: string, evidence: RuntimeEvidence) {
  await fs.mkdir(evidenceRoot, { recursive: true })
  await fs.writeFile(path.join(evidenceRoot, `${name}.json`), JSON.stringify(evidence, null, 2))
}

async function verifySurface(page: Page, surface: Surface, viewportLabel: string) {
  const runtime = await observe(page)
  await page.goto(`${baseURL}${surface.route}`, { waitUntil: 'networkidle' })

  await expect(page.getByRole('heading', { level: 1, name: surface.heading })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return to URAI Home' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Page actions' })).toBeVisible()
  await expect(page.getByRole('link', { name: surface.primaryAction })).toBeVisible()
  const footer = page.locator('footer')
  await expect(footer.getByRole('link', { name: 'Privacy & consent', exact: true })).toBeVisible()
  await expect(footer.getByRole('link', { name: 'Support', exact: true })).toBeVisible()
  await expect(footer.getByRole('link', { name: 'Status', exact: true })).toBeVisible()

  const geometry = await page.evaluate(() => {
    const actions = Array.from(document.querySelectorAll<HTMLElement>('nav[aria-label="Page actions"] a'))
    const footer = Array.from(document.querySelectorAll<HTMLElement>('footer a'))
    const allLinks = [...actions, ...footer]
    return {
      actionRects: actions.map((element) => {
        const rect = element.getBoundingClientRect()
        return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      }),
      allRects: allLinks.map((element) => {
        const rect = element.getBoundingClientRect()
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      }),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
    }
  })

  expect(geometry.actionRects.length).toBeGreaterThan(0)
  for (const rect of geometry.actionRects) {
    expect(rect.height, `${surface.id} ${viewportLabel} action height`).toBeGreaterThanOrEqual(48)
    expect(rect.left, `${surface.id} ${viewportLabel} action left containment`).toBeGreaterThanOrEqual(0)
    expect(rect.right, `${surface.id} ${viewportLabel} action right containment`).toBeLessThanOrEqual(geometry.viewport.width + 1)
  }
  for (const rect of geometry.allRects) {
    expect(rect.left, `${surface.id} ${viewportLabel} link left containment`).toBeGreaterThanOrEqual(0)
    expect(rect.right, `${surface.id} ${viewportLabel} link right containment`).toBeLessThanOrEqual(geometry.viewport.width + 1)
  }
  expect(geometry.documentWidth, `${surface.id} ${viewportLabel} horizontal overflow`).toBeLessThanOrEqual(geometry.viewport.width + 1)

  await fs.mkdir(evidenceRoot, { recursive: true })
  await page.screenshot({
    path: path.join(evidenceRoot, `${surface.id}-${viewportLabel}.png`),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })
  await save(`${surface.id}-${viewportLabel}-runtime`, runtime)

  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
}

test.describe('public institutional surface acceptance', () => {
  test.describe.configure({ timeout: 120_000 })

  for (const surface of surfaces) {
    test(`${surface.id} desktop renders the governed institutional shell`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await verifySurface(page, surface, 'desktop')
    })

    test(`${surface.id} mobile remains contained and touch-operable`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await verifySurface(page, surface, 'mobile')
    })
  }

  test('ascent Life Map compatibility route preserves the canonical transition', async ({ page }) => {
    const runtime = await observe(page)
    await page.goto(`${baseURL}/ascent/life-map/`, { waitUntil: 'domcontentloaded' })
    await page.waitForURL((url) => url.pathname === '/life-map/' && url.searchParams.get('from') === 'ascent-life-map', {
      timeout: 20_000,
    })
    await expect(page.locator('body')).not.toContainText('404')
    await save('ascent-life-map-redirect-runtime', runtime)
    expect(runtime.pageErrors).toEqual([])
  })
})
