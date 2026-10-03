import { expect, test, type Page } from '@playwright/test'

const lifeMapOwnerSelector = '[data-testid="urai-true-3d-life-map"]'

async function enableExplicitLifeMapDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

function demoMemoryUrl(overview: boolean) {
  return `/life-map?demo=1&memoryId=memory-thread&node=memory-thread&manifestId=replay-recovery-thread${overview ? '&overview=1' : ''}`
}

function lifeMapRoot(page: Page) {
  return page.getByTestId('urai-true-3d-life-map')
}

function selectedMemoryControls(page: Page) {
  return page.getByRole('navigation', { name: 'Selected memory actions' })
}

async function selectFirstMemory(page: Page) {
  const explorer = await openSemanticExplorer(page)
  const firstMemory = explorer.locator('[data-life-map-semantic-result]').first()
  await expect(firstMemory).toBeVisible({ timeout: 15_000 })
  await firstMemory.click()
  await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
  return new URL(page.url()).searchParams.get('memoryId')
}

async function openSemanticExplorer(page: Page) {
  const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
  await expect(trigger).toBeVisible({ timeout: 15_000 })
  await trigger.focus()
  await expect(trigger).toBeFocused()
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const explorer = page.getByRole('region', { name: 'Search and filter Life Map' })
  await expect(explorer).toBeVisible()
  return explorer
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
    await expect(page.getByRole('button', { name: 'Search and navigate Life Map' })).toBeVisible()
  })

  test('keyboard-accessible memory selection preserves identity into Focus', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })

    const root = lifeMapRoot(page)
    await expect(root).toBeVisible({ timeout: 15_000 })
    await expect(root).toHaveAttribute('data-life-map-source', 'explicit-demo')
    const explorer = await openSemanticExplorer(page)
    await expect(page.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()

    const firstMemory = explorer.locator('[data-life-map-semantic-result]').first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    const firstLabel = await firstMemory.locator('strong').textContent()
    await firstMemory.focus()
    await expect(firstMemory).toBeFocused()
    await firstMemory.press('Enter')

    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    const selectedUrl = new URL(page.url())
    const selectedMemoryId = selectedUrl.searchParams.get('memoryId')
    expect(selectedMemoryId).toBeTruthy()
    await expect(root).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(page.locator('.life-map-title')).toContainText((firstLabel || '').trim())

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
    expect(focusUrl.searchParams.get('manifestId')).toBe('replay-recovery-thread')
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

    await page.reload({ waitUntil: 'commit', timeout: 30_000 })
    await expect(page.locator(lifeMapOwnerSelector)).toHaveCount(1, { timeout: 30_000 })
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
        const summary = document.querySelector('.life-map-search-trigger')?.getBoundingClientRect()
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

      const explorer = await openSemanticExplorer(page)
      const explorerBox = await explorer.boundingBox()
      expect(explorerBox).not.toBeNull()
      expect(explorerBox!.x).toBeGreaterThanOrEqual(0)
      expect(explorerBox!.x + explorerBox!.width).toBeLessThanOrEqual(viewport.width)
      await explorer.getByRole('button', { name: 'Close Life Map search' }).click()
    }
  })

  test('reduced motion keeps selection and unwind behavior equivalent', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })
    await selectFirstMemory(page)
    await expect(page.locator(lifeMapOwnerSelector)).toHaveAttribute('data-life-map-phase', 'arrival')
    const actions = selectedMemoryControls(page)
    await actions.getByRole('button', { name: 'Return to Life Map overview' }).click()
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
    await page.reload({ waitUntil: 'commit', timeout: 30_000 })
    await expect(page.locator(lifeMapOwnerSelector)).toHaveCount(1, { timeout: 30_000 })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
  })
})
