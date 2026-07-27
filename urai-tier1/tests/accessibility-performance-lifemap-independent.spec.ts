import { expect, test, type Page } from '@playwright/test'

const lifeMapOwnerSelector = '[data-testid="urai-true-3d-life-map"]'

async function enableExplicitLifeMapDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

function selectedMemoryControls(page: Page) {
  return page.getByRole('navigation', { name: 'Selected memory actions' })
}

async function selectFirstMemory(page: Page) {
  const explore = page.locator('details.life-map-help')
  await expect(explore).toBeVisible({ timeout: 30_000 })
  await explore.locator('summary').click()
  const firstMemory = explore.locator('button').first()
  await expect(firstMemory).toBeVisible({ timeout: 15_000 })
  await firstMemory.click()
  await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
  return new URL(page.url()).searchParams.get('memoryId')
}

test.describe('Life Map independent realm runtime evidence', () => {
  test.describe.configure({ timeout: 90_000 })

  test('Life Map does not mount the Home companion visually, semantically, or in the tab sequence', async ({ page }) => {
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
    const shell = page.locator('[data-testid="urai-persistent-world-shell"]')
    await expect(shell).toHaveAttribute('data-world-destination', 'life-map')
    await expect(shell).toHaveAttribute('data-companion-owned', 'false')
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
    await expect(page.locator('.urai-world-companion__orb')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /orb travel controls/i })).toHaveCount(0)

    const forbiddenTabStops = await page.locator('button,a[href],summary,[tabindex]:not([tabindex="-1"])').evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      .filter((element) => element.matches('.urai-world-companion, .urai-world-companion *') || /orb travel controls/i.test(element.getAttribute('aria-label') || ''))
      .map((element) => element.outerHTML.slice(0, 240)))
    expect(forbiddenTabStops).toEqual([])
    await expect(page.locator('details.life-map-help summary')).toHaveText('Explore')
  })

  test('keyboard-accessible memory selection preserves identity into Focus', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })
    const owner = page.locator(lifeMapOwnerSelector)
    await expect(owner).toBeVisible({ timeout: 30_000 })
    const exploreSummary = page.locator('details.life-map-help summary')
    await exploreSummary.focus()
    await expect(exploreSummary).toBeFocused()
    await exploreSummary.press('Enter')
    const firstMemory = page.locator('details.life-map-help button').first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    await firstMemory.focus()
    await expect(firstMemory).toBeFocused()
    await firstMemory.press('Enter')
    const selectedMemoryId = new URL(page.url()).searchParams.get('memoryId')
    await expect(owner).toHaveAttribute('data-life-map-mode', 'selected')
    expect(selectedMemoryId).toBeTruthy()

    const focus = selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })
    await expect(focus).toBeVisible()
    await focus.focus()
    await expect(focus).toBeFocused()
    await focus.press('Enter')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/focus')
    const focusUrl = new URL(page.url())
    expect(focusUrl.searchParams.get('memoryId')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('demo')).toBe('1')
    expect(focusUrl.searchParams.get('returnNode')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('manifestId')).toBeTruthy()
  })

  test('Overview removes selected visual and semantic state across refresh and history', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })
    await selectFirstMemory(page)
    const actions = selectedMemoryControls(page)
    await expect(actions.getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await expect(actions.getByRole('button', { name: 'Replay' })).toBeVisible()
    await actions.getByRole('button', { name: 'Overview' }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)

    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)

    await page.goBack({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    await expect(actions).toBeVisible({ timeout: 15_000 })

    await page.goForward({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
  })

  test('mobile viewports contain the independent navigation layer without horizontal overflow', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    const viewports = [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 393, height: 873 },
      { width: 412, height: 915 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/life-map?demo=1&overview=1', { waitUntil: 'domcontentloaded' })
      await expect(page.locator(lifeMapOwnerSelector)).toBeVisible()
      await expect(page.locator('.urai-world-companion')).toHaveCount(0)
      await expect(selectedMemoryControls(page)).toHaveCount(0)

      const layout = await page.evaluate(() => {
        const summary = document.querySelector('details.life-map-help summary')?.getBoundingClientRect()
        const title = document.querySelector('.life-map-title')?.getBoundingClientRect()
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          summary: summary ? { left: summary.left, right: summary.right } : null,
          title: title ? { left: title.left, right: title.right } : null,
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

  test('reduced motion keeps selection and unwind behavior equivalent', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })
    await selectFirstMemory(page)
    await expect(page.locator(lifeMapOwnerSelector)).toHaveAttribute('data-life-map-phase', 'arrival')
    const actions = selectedMemoryControls(page)
    await actions.getByRole('button', { name: 'Overview' }).click()
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
  })
})
