import { test, expect } from '@playwright/test'

test.describe('URAI Spatial browser flow', () => {
  test('home is visible and enters ascent before lifemap', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await page.goto('/home')

    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('[data-scene-mode="home"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /begin ascent/i })).toBeVisible()
    await expect(page.getByTestId('urai-sky-guidance')).toContainText(/begin the ascent/i)

    await page.getByRole('button', { name: /begin ascent/i }).click()
    await expect(page).toHaveURL(/\/ascent$/)
    await expect(page.locator('[data-scene-mode="ascent"]')).toBeVisible()
    await expect(page.getByTestId('urai-ascent-guidance')).toContainText(/ascending|ascent ready/i)

    await expect(page).toHaveURL(/\/life-map$/, { timeout: 5000 })
    await expect(page.locator('[data-scene-mode="life-map"]')).toBeVisible()
    await expect(page.getByTestId('urai-lifemap-guidance')).toContainText(/click a star/i)

    expect(consoleErrors).toEqual([])
  })

  test('focus and replay empty states are safe without manifestId', async ({ page }) => {
    await page.goto('/focus')
    await expect(page.locator('[data-scene-mode="focus"]')).toBeVisible()
    await expect(page.getByTestId('urai-focus-empty-panel')).toBeVisible()
    await expect(page.getByRole('button', { name: /open life map/i })).toBeVisible()

    await page.getByRole('button', { name: /open life map/i }).click()
    await expect(page).toHaveURL(/\/life-map$/)

    await page.goto('/replay')
    await expect(page.locator('[data-scene-mode="replay"]')).toBeVisible()
    await expect(page.getByTestId('urai-focus-empty-panel')).toBeVisible()
    await expect(page.getByText(/replay needs a selected memory/i)).toBeVisible()
  })

  test('escape unwinds ascent and lifemap toward home', async ({ page }) => {
    await page.goto('/ascent')
    await expect(page.locator('[data-scene-mode="ascent"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/home$/)

    await page.goto('/life-map')
    await expect(page.locator('[data-scene-mode="life-map"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/home$/)
  })
})
