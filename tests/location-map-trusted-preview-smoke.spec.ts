import { expect, test } from '@playwright/test'

test('Location Map route renders from the requested exact build', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.goto('/location-map/', { waitUntil: 'domcontentloaded' })

  const threshold = page.locator('main[data-location-map-owner="canonical-route"][data-private-memory-mounted="false"]')
  await expect(threshold).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your places stay closed until you open them.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open disclosed sample' })).toBeVisible()
  await expect(page.getByText('No personal place history is mounted while signed out.')).toBeVisible()

  const expectedSha = process.env.URAI_EXACT_HEAD
  if (expectedSha) {
    const html = await page.content()
    expect(html).toContain(expectedSha)
  }

  expect(pageErrors).toEqual([])
})
