import { expect, test, type Page } from '@playwright/test'

const lifeMapOwnerSelector = '[data-testid="urai-true-3d-life-map"]'

async function enableExplicitLifeMapDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

function lifeMapRoot(page: Page) {
  return page.getByTestId('urai-true-3d-life-map')
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

async function openSemanticExplorer(page: Page) {
  const details = page.locator('details.life-map-help')
  await expect(details).toBeVisible({ timeout: 15_000 })
  const summary = details.locator('summary')
  await summary.focus()
  await expect(summary).toBeFocused()
  if (!(await details.getAttribute('open'))) await summary.press('Enter')
  await expect(details).toHaveAttribute('open', '')
  return details
}

test.describe('Life Map independent realm runtime evidence', () => {
  test.describe.configure({ timeout: 90_000 })

  test('Life Map does not mount the Home companion visually, semantically, or in the tab sequence', async ({ page }) => {
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
    const shell = page.locator('[data-testid="urai-persistent-world-shell"]')
    await expect(shell).toHaveAttribute('data-world-destination', 'life-map')
    await expect(shell).toHaveAttribute('data-companion-owned', 'false')
    await expect(lifeMapRoot(page)).toBeVisible({ timeout: 15_000 })
    await expect(lifeMapRoot(page)).toHaveAttribute('data-home-companion-owned', 'false')
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
    await expect(page.getByText('Explore', { exact: true })).toBeVisible()
  })

  test('keyboard-accessible memory selection preserves identity into Focus', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })

    const root = lifeMapRoot(page)
    await expect(root).toBeVisible({ timeout: 15_000 })
    await expect(root).toHaveAttribute('data-life-map-source', 'explicit-demo')
    const explorer = await openSemanticExplorer(page)
    await expect(page.getByText('Sample constellation · not your memories', { exact: true })).toBeVisible()

    const firstMemory = explorer.getByRole('button').first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    const firstLabel = await firstMemory.textContent()
    await firstMemory.focus()
    await expect(firstMemory).toBeFocused()
    await firstMemory.press('Enter')

    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    const selectedUrl = new URL(page.url())
    const selectedMemoryId = selectedUrl.searchParams.get('memoryId')
    expect(selectedMemoryId).toBeTruthy()
    await expect(root).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(page.locator('.life-map-title')).toContainText((firstLabel || '').split(':')[0].trim())

    const actions = selectedMemoryControls(page)
    await expect(actions).toBeVisible({ timeout: 15_000 })
    const focus = actions.getByRole('button', { name: 'Enter Focus' })
    await focus.focus()
    await expect(focus).toBeFocused()
    await focus.press('Enter')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/focus')
    const focusUrl = new URL(page.url())
    expect(focusUrl.searchParams.get('memoryId')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('node')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('demo')).toBe('1')
    expect(focusUrl.searchParams.get('returnNode')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('manifestId')).toBeTruthy()
    expect(focusUrl.searchParams.get('from')).toBe('life-map')
  })

  test('Overview removes selected visual and semantic state across refresh and history', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)

    await page.goto(demoMemoryUrl(false), { waitUntil: 'domcontentloaded' })
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Replay' })).toBeVisible()

    await page.goto(demoMemoryUrl(true), { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview')

    await page.goBack({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBeNull()
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })

    await page.goForward({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)
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
