import { expect, test } from '@playwright/test'

test('Replay unwinds through Focus to Life Map without re-entering Replay', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/replay/?demo=1&manifestId=replay-recovery-thread', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('cinematic-replay-client')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: '← Focus', exact: true }).click()
  await expect(page.getByTestId('urai-final-focus-chamber')).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/focus')
  await page.getByRole('button', { name: '← Life Map', exact: true }).click()
  await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, ''), { timeout: 30_000 }).toBe('/life-map')
  await expect(page.getByTestId('cinematic-replay-client')).toHaveCount(0)
  await expect(page.getByTestId('urai-final-focus-chamber')).toHaveCount(0)
})
