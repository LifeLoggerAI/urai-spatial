import { expect, test } from '@playwright/test'

const route = '/possible-futures'

async function rect(locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box
}

test.describe('Possible Futures accessibility and truth evidence', () => {
  test('desktop route exposes scenario truth, keyboard controls and 48px targets', async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    const root = page.getByTestId('urai-possible-futures')
    await expect(root).toBeVisible()
    await expect(root).toHaveAttribute('data-truth-mode', 'scenario')
    await expect(page.getByText('POSSIBLE FUTURE · NOT A MEMORY', { exact: true })).toBeVisible()
    await expect(page.getByText(/Ask a what-if question/i)).toBeVisible()

    const question = page.getByLabel('What do you want to explore?')
    const create = page.getByRole('button', { name: 'Create Possible Future' })
    const back = page.getByRole('button', { name: 'Return' })

    await question.focus()
    await expect(question).toBeFocused()
    await question.fill('What if I change one assumption?')
    await page.keyboard.press('Tab')
    await expect(create).toBeFocused()

    for (const control of [question, create, back]) {
      const box = await rect(control)
      expect(box.height).toBeGreaterThanOrEqual(48)
    }
  })

  test('small viewport remains contained without hiding the truth boundary', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(route, { waitUntil: 'domcontentloaded' })

    const marker = page.getByText('POSSIBLE FUTURE · NOT A MEMORY', { exact: true })
    const question = page.getByLabel('What do you want to explore?')
    const back = page.getByRole('button', { name: 'Return' })
    await expect(marker).toBeVisible()
    await expect(question).toBeVisible()
    await expect(back).toBeVisible()

    for (const control of [question, back]) {
      const box = await rect(control)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(320)
      expect(box.height).toBeGreaterThanOrEqual(48)
    }
  })

  test('reduced motion freezes decorative branch drift', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('urai-possible-futures')).toBeVisible()
    const sourceMarker = page.locator('main[data-truth-mode="scenario"]')
    await expect(sourceMarker).toBeVisible()
    await expect(page.getByText('POSSIBLE FUTURE · NOT A MEMORY', { exact: true })).toBeVisible()
  })
})

test.describe('Possible Futures from the touch Orb menu', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('sound and scenario controls accept their own taps', async ({ page }) => {
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('home-semantic-orb').tap()
    const menu = page.locator('#urai-world-companion-menu')
    await menu.getByRole('button', { name: 'Enable spatial sound' }).tap()
    await menu.getByRole('button', { name: 'Mute spatial sound' }).tap()
    await expect(menu.getByRole('button', { name: 'Enable spatial sound' })).toHaveAttribute('aria-pressed', 'false')
    await menu.getByRole('button', { name: 'Explore a Possible Future' }).tap()
    await expect(page).toHaveURL(/\/possible-futures(?:[/?#]|$)/)
  })
})
