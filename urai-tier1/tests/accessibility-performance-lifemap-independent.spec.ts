import { expect, test, type Page } from '@playwright/test'

async function enableExplicitLifeMapDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('urai:lifeMapDemoMode', 'true')
  })
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

    const focus = menu.getByRole('button', { name: 'Enter Focus' })
    await expect(focus).toBeVisible()
    await focus.click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/focus')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe(selectedMemoryId)
    expect(new URL(page.url()).searchParams.get('returnNode')).toBe(selectedMemoryId)
    expect(new URL(page.url()).searchParams.get('lifeMapOrigin')).toBeTruthy()
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
      await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.life-map-independent-realm')).toBeVisible()
      await expect(page.locator('.urai-world-companion')).toHaveCount(0)

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
    await page.getByText('Map controls', { exact: true }).click()
    const firstMemory = page.locator('.life-map-accessibility-menu button').filter({ hasNotText: /Enter Focus|Replay|Overview|Ground|Home/i }).first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    await firstMemory.click()
    await expect.poll(() => page.url()).toContain('memoryId=')
    await page.keyboard.press('Escape')
    await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe('/life-map')
  })
})
