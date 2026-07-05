import { test, expect } from '@playwright/test'

const seed = 'seed-memory-bloom'

test('final Replay owner works on desktop and mobile', async ({ page }) => {
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto(`/replay?manifestId=${seed}`)
  const replay = page.locator('.uraiAutoReplay')
  const beats = page.locator('.uraiReplayBeats')
  const controls = page.locator('.uraiReplayControls')

  await expect(replay).toBeVisible()
  await expect(replay).toHaveAttribute('aria-label', 'Cinematic memory replay')
  await expect(replay).toContainText('MEMORY FILM')
  await expect(replay).toContainText('The Quiet Reset')
  await expect(beats).toBeVisible()
  await expect(beats).toContainText('Pressure')
  await expect(beats).toContainText('Reset')
  await expect(controls).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause memory replay' })).toBeVisible()

  await page.getByRole('link', { name: 'Back to Focus' }).click()
  await expect(page).toHaveURL(/\/focus\?memoryId=quiet-reset/)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/replay?manifestId=${seed}`)
  await expect(page.locator('.uraiAutoReplay')).toBeVisible()
  await expect(page.locator('.uraiReplayBeats')).toBeVisible()
  await expect(page.locator('.uraiReplayControls')).toBeVisible()

  expect(consoleErrors).toEqual([])
})
