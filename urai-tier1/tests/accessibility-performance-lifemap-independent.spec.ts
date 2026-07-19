import { expect, test, type Page } from '@playwright/test'

async function enableExplicitLifeMapDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('urai:lifeMapDemoMode', 'true')
  })
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

function selectedMemoryControls(page: Page) {
  return page.locator('.life-map-memory-portals')
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

test.describe('Life Map independent realm runtime evidence', () => {
  test('Life Map does not mount the Home companion visually, semantically, or in the tab sequence', async ({ page }) => {
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })

    const shell = page.locator('[data-testid="urai-persistent-world-shell"]')
    await expect(shell).toHaveAttribute('data-world-destination', 'life-map')
    await expect(shell).toHaveAttribute('data-companion-owned', 'false')
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
    await expect(page.getByText('Map controls', { exact: true })).toBeVisible()
  })

  test('keyboard-accessible memory selection preserves identity into Focus', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })

    const controls = page.getByText('Map controls', { exact: true })
    await controls.focus()
    await expect(controls).toBeFocused()
    await controls.press('Enter')

    const menu = page.locator('.life-map-accessibility-menu')
    await expect(page.locator('.life-map-sample-boundary')).toContainText('Sample constellation · not your memories')
    const firstMemory = menu.locator('button').filter({ hasNotText: /Enter Focus|Replay|Overview|Ground|Home/i }).first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    const firstLabel = await firstMemory.textContent()
    await firstMemory.click()

    await expect.poll(() => page.url()).toContain('memoryId=')
    const selectedUrl = new URL(page.url())
    const selectedMemoryId = selectedUrl.searchParams.get('memoryId')
    expect(selectedMemoryId).toBeTruthy()
    await expect(page.locator('.life-map-whisper')).toContainText((firstLabel || '').split(':')[0].trim())

    // Selected mode intentionally closes the semantic list and transfers action
    // ownership to the one visible spatial portal surface. Prove that surface is
    // keyboard reachable rather than reopening the hidden competing menu.
    const portals = selectedMemoryControls(page)
    await expect(portals).toBeVisible({ timeout: 15_000 })
    const focus = portals.getByRole('button', { name: 'Enter Focus' })
    await expect(focus).toBeVisible()
    await focus.focus()
    await expect(focus).toBeFocused()
    await focus.press('Enter')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/focus')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe(selectedMemoryId)
    expect(new URL(page.url()).searchParams.get('returnNode')).toBe(selectedMemoryId)
    expect(new URL(page.url()).searchParams.get('lifeMapOrigin')).toBeTruthy()
  })

  test('Overview preserves memory identity while removing selected visual and semantic state across refresh and history', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)

    await page.goto(demoMemoryUrl(false), { waitUntil: 'domcontentloaded' })
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Replay' })).toBeVisible()

    await page.goto(demoMemoryUrl(true), { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(selectedMemoryControls(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enter Focus' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Replay' })).toHaveCount(0)

    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.goBack({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBeNull()
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })

    await page.goForward({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
    await expect(selectedMemoryControls(page)).toHaveCount(0)
  })

  test('mobile viewports contain the independent navigation layer without horizontal overflow', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    const viewports = [
      { width: 360, height: 800 },
      { width: 393, height: 873 },
      { width: 412, height: 915 },
      { width: 432, height: 960 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto(demoMemoryUrl(true), { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.life-map-independent-realm')).toBeVisible()
      await expect(page.locator('.urai-world-companion')).toHaveCount(0)
      await expect(selectedMemoryControls(page)).toHaveCount(0)
      expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
      expect(new URL(page.url()).searchParams.get('overview')).toBe('1')

      const layout = await page.evaluate(() => {
        const summary = document.querySelector('.life-map-accessibility-menu summary')?.getBoundingClientRect()
        const realm = document.querySelector('.life-map-realm-mark')?.getBoundingClientRect()
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          summary: summary ? { left: summary.left, right: summary.right, top: summary.top, bottom: summary.bottom } : null,
          realm: realm ? { left: realm.left, right: realm.right, top: realm.top, bottom: realm.bottom } : null,
        }
      })

      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
      expect(layout.summary).not.toBeNull()
      expect(layout.realm).not.toBeNull()
      expect(layout.summary!.left).toBeGreaterThanOrEqual(0)
      expect(layout.summary!.right).toBeLessThanOrEqual(viewport.width)
      expect(layout.realm!.left).toBeGreaterThanOrEqual(0)
      expect(layout.realm!.right).toBeLessThanOrEqual(viewport.width)
    }
  })

  test('reduced motion keeps selection and unwind behavior equivalent', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
    const controls = page.getByText('Map controls', { exact: true })
    await controls.focus()
    await expect(controls).toBeFocused()
    await controls.press('Enter')
    const firstMemory = page.locator('.life-map-accessibility-menu button').filter({ hasNotText: /Enter Focus|Replay|Overview|Ground|Home/i }).first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    await firstMemory.click()
    await expect.poll(() => page.url()).toContain('memoryId=')
    const selectedMemoryId = new URL(page.url()).searchParams.get('memoryId')
    await page.keyboard.press('Escape')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect(page.getByRole('status').filter({ hasText: /Returned to Life Map overview/i })).toBeVisible()
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBe(selectedMemoryId)
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe(selectedMemoryId)
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(selectedMemoryControls(page)).toHaveCount(0)
  })
})
