import { expect, test, type Page } from '@playwright/test'

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
    expect(focusUrl.searchParams.get('memoryId')).toBe(`demo:${selectedMemoryId}`)
    expect(focusUrl.searchParams.get('node')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('demo')).toBe('1')
    expect(focusUrl.searchParams.get('returnNode')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('manifestId')).toBeTruthy()
    expect(focusUrl.searchParams.get('from')).toBe('life-map')
  })

  test('Overview preserves memory identity while removing selected visual and semantic state across refresh and history', async ({ page }) => {
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
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
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
      { width: 393, height: 873 },
      { width: 412, height: 915 },
      { width: 432, height: 960 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })
      await expect(lifeMapRoot(page)).toBeVisible({ timeout: 15_000 })
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
    }
  })
})
