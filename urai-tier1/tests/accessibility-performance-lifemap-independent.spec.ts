import { expect, test, type Page } from '@playwright/test'

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

function selectedMemoryControls(page: Page) {
  return page.getByRole('navigation', { name: 'Selected memory actions' })
}

function demoMemoryUrl(overview = false) {
  const query = new URLSearchParams({
    memoryId: 'memory-thread',
    manifestId: 'replay-recovery-thread',
    node: 'memory-thread',
    demo: '1',
  })
  if (overview) query.set('overview', '1')
  return `/life-map?${query.toString()}`
}

async function openDemoNavigator(page: Page) {
  await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })
  const navigator = page.locator('details[data-life-map-navigator]')
  await expect(navigator).toBeVisible({ timeout: 15_000 })
  await navigator.locator('summary').click()
  await expect(navigator.locator('section')).toBeVisible()
  return navigator
}

test.describe('Life Map independent realm runtime evidence', () => {
  test('Life Map does not mount the Home companion visually, semantically, or in the tab sequence', async ({ page }) => {
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })

    const shell = page.locator('[data-testid="urai-persistent-world-shell"]')
    await expect(shell).toHaveAttribute('data-world-destination', 'life-map')
    await expect(shell).toHaveAttribute('data-companion-owned', 'false')
    await expect(page.locator('.life-map-root')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
    await expect(page.locator('.urai-world-companion__orb')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /orb travel controls/i })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('Orb companion')

    const forbiddenTabStops = await page.locator('button,a[href],summary,[tabindex]:not([tabindex="-1"])').evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      .filter((element) => element.matches('.urai-world-companion, .urai-world-companion *') || /orb travel controls/i.test(element.getAttribute('aria-label') || ''))
      .map((element) => element.outerHTML.slice(0, 240)))

    expect(forbiddenTabStops).toEqual([])
    await expect(page.locator('details[data-life-map-navigator] summary')).toHaveText('Search life')
  })

  test('keyboard-accessible semantic memory selection preserves explicit demo identity into Focus', async ({ page }) => {
    const navigator = await openDemoNavigator(page)
    await expect(page.locator('.life-map-title')).toContainText('Sample constellation · not your memories')

    const firstMemory = navigator.locator('.semantic-results > button').first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    await firstMemory.focus()
    await expect(firstMemory).toBeFocused()
    await firstMemory.press('Enter')

    await expect.poll(() => page.url()).toContain('memoryId=')
    const selectedUrl = new URL(page.url())
    const selectedMemoryId = selectedUrl.searchParams.get('memoryId')
    expect(selectedMemoryId).toBeTruthy()
    await expect(page.locator('.life-map-root')).toHaveAttribute('data-life-map-mode', 'selected')

    const portals = selectedMemoryControls(page)
    await expect(portals).toBeVisible({ timeout: 15_000 })
    const focus = portals.getByRole('button', { name: 'Enter Focus' })
    await expect(focus).toBeVisible()
    await focus.focus()
    await expect(focus).toBeFocused()
    await focus.press('Enter')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/focus')
    await expect(page.getByTestId('urai-final-focus-chamber')).toHaveAttribute('data-memory-status', 'demo', { timeout: 15_000 })
    const focusUrl = new URL(page.url())
    expect(focusUrl.searchParams.get('memoryId')).toBe(`demo:${selectedMemoryId}`)
    expect(focusUrl.searchParams.get('demo')).toBe('1')
    expect(focusUrl.searchParams.get('returnNode')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('manifestId')).toBe('demo-manifest')
  })

  test('Overview clears selected visual and semantic state across refresh and browser return', async ({ page }) => {
    await page.goto(demoMemoryUrl(false), { waitUntil: 'domcontentloaded' })
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Replay' })).toBeVisible()

    await selectedMemoryControls(page).getByRole('button', { name: 'Overview' }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBeNull()
    await expect(selectedMemoryControls(page)).toHaveCount(0)
    await expect(page.locator('.life-map-root')).toHaveAttribute('data-life-map-mode', 'overview')

    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.goto('/home', { waitUntil: 'domcontentloaded' })
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBeNull()
    await expect(selectedMemoryControls(page)).toHaveCount(0)
    await expect(page.locator('.life-map-root')).toHaveAttribute('data-life-map-mode', 'overview')
  })

  test('mobile viewports contain the independent navigation layer without horizontal overflow', async ({ page }) => {
    const viewports = [
      { width: 360, height: 800 },
      { width: 393, height: 873 },
      { width: 412, height: 915 },
      { width: 432, height: 960 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/life-map?demo=1&overview=1', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.life-map-root')).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('.urai-world-companion')).toHaveCount(0)
      await expect(selectedMemoryControls(page)).toHaveCount(0)

      const layout = await page.evaluate(() => {
        const summary = document.querySelector('details[data-life-map-navigator] summary')?.getBoundingClientRect()
        const title = document.querySelector('.life-map-title')?.getBoundingClientRect()
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          summary: summary ? { left: summary.left, right: summary.right, top: summary.top, bottom: summary.bottom } : null,
          title: title ? { left: title.left, right: title.right, top: title.top, bottom: title.bottom } : null,
        }
      })

      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
      expect(layout.summary).not.toBeNull()
      expect(layout.title).not.toBeNull()
      expect(layout.summary!.left).toBeGreaterThanOrEqual(0)
      expect(layout.summary!.right).toBeLessThanOrEqual(viewport.width)
      expect(layout.title!.left).toBeGreaterThanOrEqual(0)
      expect(layout.title!.right).toBeLessThanOrEqual(viewport.width)
    }
  })

  test('reduced motion keeps semantic selection and Escape unwind behavior equivalent', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const navigator = await openDemoNavigator(page)
    const firstMemory = navigator.locator('.semantic-results > button').first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    await firstMemory.click()
    await expect(page.locator('.life-map-root')).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(page.locator('.life-map-root')).toHaveAttribute('data-life-map-phase', 'arrival')

    await page.keyboard.press('Escape')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(page.locator('.life-map-root')).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)
  })
})
