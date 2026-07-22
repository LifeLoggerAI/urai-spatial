import { expect, test } from '@playwright/test'

test('Location Map route renders from the requested exact build', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/location-map/', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('[data-launch-surface="premium-emotional-weather-atlas"]')).toBeVisible()
  await expect(page.locator('body')).toContainText(/Location|Places|Map|Atlas/i)

  const expectedSha = process.env.URAI_EXACT_HEAD
  if (expectedSha) {
    const html = await page.content()
    expect(html).toContain(expectedSha)
  }

  expect(pageErrors).toEqual([])
})
