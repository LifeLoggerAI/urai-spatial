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
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.apply(this, [type, ...args] as Parameters<typeof original>)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}

async function targetSize(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) => elements
    .map((element) => ({ element, rect: element.getBoundingClientRect(), style: getComputedStyle(element) }))
    .filter(({ rect, style }) => style.visibility !== 'hidden' && style.display !== 'none' && style.display !== 'inline' && rect.width > 0 && rect.height > 0)
    .map(({ element, rect }) => ({ html: element.outerHTML.slice(0, 240), width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 })))
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
          const hasLabel = element.id ? Boolean(document.querySelector(`label[for="${CSS.escape(element.id)}"]`)) : false
          const hasParentLabel = Boolean(element.closest('label'))
          return !(aria || labelledBy || text || title || value || hasLabel || hasParentLabel)
        })
        .map((element) => element.outerHTML.slice(0, 240)))
      report.push({ route: route.name, unnamed })
    }
    await test.info().attach('accessible-name-report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
    expect(report.flatMap((entry) => entry.unnamed)).toEqual([])
  })

  test('serialized Orb and Focus targets meet 48 CSS pixel minimum', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const orb = page.getByRole('button', { name: /open orb travel controls/i })
    await expect(orb).toBeVisible()
    await expect(orb).toBeEnabled()
    await orb.click()
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'false')
    const companionTargets = await targetSize(page, '.urai-world-companion__menu button')

    await page.goto('/focus?memoryId=seed-memory-bloom&manifestId=seed-memory-bloom&node=seed-memory-bloom&demo=1', { waitUntil: 'domcontentloaded' })
    const focusTargets = await targetSize(page, '.focus-spatial-aperture-button, .focusControls button, .neutralActions button, .webglRecovery button')

    expect(companionTargets.length).toBeGreaterThan(0)
    expect(focusTargets.length).toBeGreaterThan(0)
    const failures = [...companionTargets, ...focusTargets].filter(({ width, height }) => width < 48 || height < 48)
    await test.info().attach('serialized-target-size-report.json', { body: JSON.stringify({ companionTargets, focusTargets, failures }, null, 2), contentType: 'application/json' })
    expect(failures).toEqual([])
  })

  test('Orb menu enters focus, closes on Escape, and returns focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(orb).toBeEnabled()
    await orb.focus()
    await orb.press('Enter')
    await expect(orb).toHaveAttribute('aria-expanded', 'true')
    await expect(orb).toHaveAccessibleName(/close orb travel controls/i)
    const firstDestination = page.locator('#urai-world-companion-menu button:not([disabled])').first()
    await expect(firstDestination).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(orb).toBeFocused()
    await expect(orb).toHaveAttribute('aria-expanded', 'false')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'true')
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
    test.setTimeout(90_000)
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
        const hasScrollableAncestor = (element: Element) => {
          let current = element.parentElement
          while (current) {
            const style = getComputedStyle(current)
            const overflowsHorizontally = current.scrollWidth > current.clientWidth
            if (current.matches('.ground-destination-compass') && overflowsHorizontally) return true
            if (/auto|scroll/.test(style.overflowX) && overflowsHorizontally) return true
            current = current.parentElement
          }
          return false
        }
        return elements
          .map((element) => ({ element, rect: element.getBoundingClientRect(), style: getComputedStyle(element) }))
          .filter(({ rect, style }) => style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0)
          .filter(({ element, rect }) => {
            const intersects = rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top
            const fullyContained = rect.left >= left && rect.right <= right && rect.top >= top && rect.bottom <= bottom
            return intersects && !fullyContained && !hasScrollableAncestor(element)
          })
          .map(({ element, rect }) => ({ html: element.outerHTML.slice(0, 240), left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }))
      })
      report.push({ route: route.name, clipped })
    }

    await page.goto('/ground', { waitUntil: 'domcontentloaded' })
    const railTargets = page.locator('.ground-destination-compass :is(a,button)')
    const focusContainment: Array<{ label: string; fullyContained: boolean; left: number; right: number }> = []
    for (let index = 0; index < await railTargets.count(); index += 1) {
      const target = railTargets.nth(index)
      await target.focus()
      await expect(target).toBeFocused()
      await target.evaluate((element) => element.scrollIntoView({ block: 'nearest', inline: 'center' }))
      await page.waitForTimeout(250)
      focusContainment.push(await target.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const rail = element.closest<HTMLElement>('.ground-destination-compass')
        const railRect = rail?.getBoundingClientRect() ?? rect
        const viewport = window.visualViewport
        const leftBoundary = Math.max(viewport?.offsetLeft ?? 0, railRect.left)
        const rightBoundary = Math.min(
          (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth),
          railRect.right,
        )
        return {
          label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? 'unknown',
          fullyContained: rect.left >= leftBoundary && rect.right <= rightBoundary,
          left: rect.left,
          right: rect.right,
        }
      }))
    }

    await test.info().attach('mobile-safe-area-report.json', {
      body: JSON.stringify({ fixedControls: report, scrollableGroundRail: focusContainment }, null, 2),
      contentType: 'application/json',
    })
    expect(report.flatMap((entry) => entry.clipped)).toEqual([])
    expect(focusContainment.filter((entry) => !entry.fullyContained)).toEqual([])
  })

  test('no-WebGL mode exposes the complete keyboard-operable Home fallback', async ({ page }) => {
    await disableWebGL(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const fallback = page.locator('[data-testid="urai-home-accessible-fallback"][data-webgl-state="unavailable"]')
    await expect(fallback).toBeVisible()
    await expect(fallback.getByRole('link', { name: /ground/i }).first()).toBeVisible()
    await expect(fallback.getByRole('link', { name: /life map/i }).first()).toBeVisible()
    await expect(fallback.getByRole('button', { name: /open urai orb companion/i })).toBeVisible()
  })

  test('WebGL context loss recovery is bounded and preserves the route', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const before = page.url()
    const runtime = page.locator('.urai-home-spatial-runtime-layer')
    await expect(runtime.locator('canvas')).toBeVisible({ timeout: 15_000 })
    await runtime.locator('canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    await expect(runtime.getByRole('status').filter({ hasText: /Restoring the spatial Home renderer/i })).toBeVisible()
    await expect(runtime.locator('canvas')).toBeVisible({ timeout: 15_000 })
    await expect.poll(() => page.url()).toBe(before)

    await runtime.locator('canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    const fallback = page.locator('[data-urai-home-runtime="accessible-fallback-after-renderer-failure"]')
    await expect(fallback).toBeVisible()
    await expect(fallback.getByRole('status').filter({ hasText: /could not recover/i })).toBeVisible()
    await expect.poll(() => page.url()).toBe(before)
  })

  test('offline transition preserves the current route and recovers online', async ({ page, context }) => {
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
    const before = page.url()
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect.poll(() => page.url()).toBe(before)
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect.poll(() => page.url()).toBe(before)
  })
})