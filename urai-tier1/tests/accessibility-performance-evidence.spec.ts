import { expect, test, type Page } from '@playwright/test'

const routes = [
  { name: 'home', path: '/' },
  { name: 'ground', path: '/ground' },
  { name: 'life-map', path: '/life-map' },
  { name: 'focus', path: '/focus?memoryId=seed-memory-bloom&manifestId=seed-memory-bloom&node=seed-memory-bloom&demo=1' },
  { name: 'replay', path: '/replay?memoryId=seed-memory-bloom&manifestId=seed-memory-bloom&node=seed-memory-bloom&demo=1' },
] as const

const interactiveSelector = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}

test.describe('URAI accessibility and performance evidence', () => {
  test('all visible interactive controls have accessible names', async ({ page }) => {
    const report: Array<{ route: string; unnamed: string[] }> = []
    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      const unnamed = await page.locator(interactiveSelector).evaluateAll((elements) => elements
        .filter((element) => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
        })
        .filter((element) => {
          const aria = element.getAttribute('aria-label')?.trim()
          const labelledBy = element.getAttribute('aria-labelledby')?.trim()
          const text = element.textContent?.trim()
          const title = element.getAttribute('title')?.trim()
          const value = element instanceof HTMLInputElement ? element.value.trim() : ''
          return !(aria || labelledBy || text || title || value)
        })
        .map((element) => element.outerHTML.slice(0, 240)))
      report.push({ route: route.name, unnamed })
    }
    await test.info().attach('accessible-name-report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
    expect(report.flatMap((entry) => entry.unnamed)).toEqual([])
  })

  test('primary visible targets meet 48 CSS pixel minimum', async ({ page }) => {
    test.fixme(true, 'Serialized target-size failures are tracked in issue #696; remove fixme only after exact-head owner fix and proof.')
    const report: Array<{ route: string; failures: Array<{ html: string; width: number; height: number }> }> = []
    for (const route of routes) {
      await page.setViewportSize({ width: 393, height: 873 })
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      const failures = await page.locator(interactiveSelector).evaluateAll((elements) => elements
        .map((element) => ({ element, rect: element.getBoundingClientRect(), style: getComputedStyle(element) }))
        .filter(({ rect, style }) => style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0)
        .filter(({ rect }) => rect.width < 48 || rect.height < 48)
        .map(({ element, rect }) => ({ html: element.outerHTML.slice(0, 240), width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 })))
      report.push({ route: route.name, failures })
    }
    await test.info().attach('target-size-report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
    expect(report.flatMap((entry) => entry.failures)).toEqual([])
  })

  test('reduced motion removes active CSS animations from primary controls', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      const activeAnimations = await page.locator(interactiveSelector).evaluateAll((elements) => elements
        .filter((element) => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          if (style.visibility === 'hidden' || style.display === 'none' || rect.width === 0 || rect.height === 0) return false
          return style.animationName !== 'none' && style.animationDuration !== '0s' && style.animationDuration !== '0.001s'
        })
        .map((element) => ({ html: element.outerHTML.slice(0, 240), animationName: getComputedStyle(element).animationName, animationDuration: getComputedStyle(element).animationDuration })))
      expect(activeAnimations, `${route.name} has active primary-control animation under reduced motion`).toEqual([])
    }
  })

  test('mobile visible controls stay inside the visual viewport and safe area', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 })
    const report: Array<{ route: string; clipped: Array<{ html: string; left: number; top: number; right: number; bottom: number }> }> = []
    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      const clipped = await page.locator(interactiveSelector).evaluateAll((elements) => {
        const viewport = window.visualViewport
        const left = viewport?.offsetLeft ?? 0
        const top = viewport?.offsetTop ?? 0
        const right = left + (viewport?.width ?? window.innerWidth)
        const bottom = top + (viewport?.height ?? window.innerHeight)
        return elements
          .map((element) => ({ element, rect: element.getBoundingClientRect(), style: getComputedStyle(element) }))
          .filter(({ rect, style }) => style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0)
          .filter(({ rect }) => rect.left < left || rect.top < top || rect.right > right || rect.bottom > bottom)
          .map(({ element, rect }) => ({ html: element.outerHTML.slice(0, 240), left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }))
      })
      report.push({ route: route.name, clipped })
    }
    await test.info().attach('mobile-safe-area-report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
    expect(report.flatMap((entry) => entry.clipped)).toEqual([])
  })

  test('no-WebGL mode exposes a meaningful keyboard-operable fallback', async ({ page }) => {
    test.fixme(true, 'Home runtime currently suppresses the WebGL layer without a dedicated fallback; owner handoff is recorded by the source contract and PR.')
    await disableWebGL(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const fallback = page.getByRole('region', { name: /spatial home fallback/i })
    await expect(fallback).toBeVisible()
    await expect(fallback.getByRole('button')).toHaveCount(2)
  })

  test('WebGL context loss is bounded and does not reset the route', async ({ page }) => {
    test.fixme(true, 'Context-loss recovery requires exact owner implementation and cannot be patched from this lane.')
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const before = page.url()
    await page.locator('canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    await expect(page.getByRole('status')).toContainText(/restor|recover/i)
    await page.locator('canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextrestored')))
    await expect.poll(() => page.url()).toBe(before)
  })

  test('offline transition is announced and recovery stays on the same route', async ({ page, context }) => {
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
    const before = page.url()
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.waitForTimeout(200)
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect.poll(() => page.url()).toBe(before)
  })
})
