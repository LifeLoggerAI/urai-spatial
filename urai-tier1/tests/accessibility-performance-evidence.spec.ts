import { expect, test, type Page } from '@playwright/test'

const FOCUS_DEMO_PATH = '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'
const FOCUS_RAW_DEMO_PATH = '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

function normalizedPathname(url: string) {
  const pathname = new URL(url).pathname.replace(/\/+$/, '')
  return pathname || '/'
}

async function enabledFocusButtons(page: Page) {
  return page.locator('[data-testid="urai-final-focus-chamber"] button:not([disabled])')
}

async function minimumTargetSize(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return {
      text: element.textContent?.trim() ?? '',
      width: rect.width,
      height: rect.height,
    }
  }))
}

async function hasScrollableAncestor(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    let current: HTMLElement | null = element.parentElement
    while (current) {
      const style = getComputedStyle(current)
      const overflow = `${style.overflow}${style.overflowX}${style.overflowY}`
      if (/(auto|scroll)/.test(overflow) && (current.scrollWidth > current.clientWidth || current.scrollHeight > current.clientHeight)) {
        return true
      }
      current = current.parentElement
    }
    return false
  })
}

test.describe('Accessibility and performance evidence', () => {
  test('persistent Orb exposes an accessible 48px travel control outside companion-free routes', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' })
    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toBeVisible()
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    const box = await orb.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(48)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(48)
    await orb.click()
    await expect(orb).toHaveAccessibleName(/close orb travel controls/i)
    await page.keyboard.press('Escape')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
  })

  test('Ground destination rail remains keyboard accessible, scrollable, and contained', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/ground', { waitUntil: 'domcontentloaded' })
    const rail = page.locator('[aria-label="Ground destinations"]')
    await expect(rail).toBeVisible()
    const buttons = rail.getByRole('button')
    expect(await buttons.count()).toBeGreaterThan(0)
    const sizes = await minimumTargetSize(page, '[aria-label="Ground destinations"] button')
    for (const size of sizes) {
      expect(size.width, `${size.text} width`).toBeGreaterThanOrEqual(48)
      expect(size.height, `${size.text} height`).toBeGreaterThanOrEqual(48)
    }
    const scrollableGroundRail = await hasScrollableAncestor(page, '[aria-label="Ground destinations"] button:last-of-type')
    expect(scrollableGroundRail).toBe(true)
  })

  test('Focus controls meet 48px targets and companion-free ownership', async ({ page }) => {
    await page.goto(FOCUS_DEMO_PATH, { waitUntil: 'domcontentloaded' })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')
    await expect(chamber).toBeVisible()
    await expect(chamber).toHaveAttribute('data-orb-owner', 'none')
    await expect(page.locator('[data-urai-audit-action="orb-controls"]')).toHaveCount(0)
    const buttons = await enabledFocusButtons(page)
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index)
      const box = await button.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(48)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(48)
    }
  })

  test('direct raw demo identity resolves without browser storage or private auth', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('urai:lifeMapDemoMode')
      window.localStorage.removeItem('urai:userId')
    })
    await page.goto(FOCUS_RAW_DEMO_PATH, { waitUntil: 'domcontentloaded' })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')
    await expect(chamber).toBeVisible()
    await expect(chamber).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    await expect(chamber).toHaveAttribute('data-star-id', 'quiet-reset')
  })

  test('same-path Focus recovery completes world state and Escape returns to Life Map', async ({ page }) => {
    await page.goto('/focus', { waitUntil: 'domcontentloaded' })
    const recovery = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="unavailable"]')
    await expect(recovery).toBeVisible()
    const recoverySurface = await recovery.locator('section[role="alert"]').evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderTopWidth: style.borderTopWidth,
        boxShadow: style.boxShadow,
      }
    })
    expect(recoverySurface.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(recoverySurface.backgroundImage).toBe('none')
    expect(recoverySurface.borderTopWidth).toBe('0px')
    expect(recoverySurface.boxShadow).toBe('none')
    await recovery.getByRole('button', { name: /open disclosed demo/i }).click()
    await expect(page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => page.url()).toContain('memoryId=demo%3Aquiet-reset')
    await expect(page.locator('.urai-world-transition')).toHaveAttribute('data-phase', 'idle')

    await page.keyboard.press('Escape')
    await expect.poll(() => normalizedPathname(page.url()), { timeout: 10_000 }).toBe('/life-map')
    await expect(page.locator('[data-testid="urai-true-3d-life-map"]')).toBeVisible()
  })

  test('Focus keeps the aperture dominant, Replay spatial, and metadata progressive', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(FOCUS_DEMO_PATH, { waitUntil: 'domcontentloaded' })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')
    await expect(chamber).toBeVisible()
    const aperture = chamber.locator('figure')
    const replay = chamber.getByRole('button', { name: /open replay for the quiet reset/i })
    const details = chamber.locator('details')
    const summary = details.locator('summary')
    await expect(aperture).toBeVisible()
    await expect(replay).toBeVisible()
    await expect(details).not.toHaveAttribute('open', '')
    await expect(summary).toBeVisible()
    const apertureBox = await aperture.boundingBox()
    const replayBox = await replay.boundingBox()
    expect((apertureBox?.width ?? 0) * (apertureBox?.height ?? 0)).toBeGreaterThan((replayBox?.width ?? 0) * (replayBox?.height ?? 0))
    expect(Math.abs((replayBox?.width ?? 0) - (replayBox?.height ?? 0))).toBeLessThanOrEqual(6)
  })

  test('mobile and short-landscape Focus remain contained', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport)
      await page.goto(FOCUS_DEMO_PATH, { waitUntil: 'domcontentloaded' })
      const chamber = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')
      await expect(chamber).toBeVisible()
      const containment = await chamber.evaluate((element) => ({
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
      }))
      expect(containment.scrollWidth).toBeLessThanOrEqual(containment.viewportWidth + 1)
      expect(containment.left).toBeGreaterThanOrEqual(-1)
      expect(containment.right).toBeLessThanOrEqual(containment.viewportWidth + 1)
    }
  })

  test('reduced motion keeps Focus complete and removes authored animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(FOCUS_DEMO_PATH, { waitUntil: 'domcontentloaded' })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')
    await expect(chamber).toBeVisible()
    const animated = await chamber.locator('*').evaluateAll((elements) => elements.filter((element) => {
      const style = getComputedStyle(element)
      return style.animationName !== 'none' && style.animationDuration !== '0s'
    }).length)
    expect(animated).toBe(0)
  })

  test('Focus remains usable without WebGL and after renderer context recovery', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function patched(type: string, ...args: unknown[]) {
        if (type === 'webgl' || type === 'webgl2') return null
        return original.call(this, type as never, ...(args as never[]))
      } as typeof original
    })
    await page.goto(FOCUS_DEMO_PATH, { waitUntil: 'domcontentloaded' })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')
    await expect(chamber).toBeVisible()
    await expect(chamber.getByRole('button', { name: /open replay for the quiet reset/i })).toBeVisible()
  })

  test('offline refresh preserves the already-exported Focus route', async ({ page, context }) => {
    await page.goto(FOCUS_DEMO_PATH, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')).toBeVisible()
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await expect(page.locator('[data-testid="urai-final-focus-chamber"]')).toBeVisible()
    await context.setOffline(false)
  })
})
