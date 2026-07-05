import { test, expect } from '@playwright/test'

const seed = 'seed-memory-bloom'

test('current replay contract works on desktop and mobile', async ({ page }) => {
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto(`/replay?manifestId=${seed}`)
  const replay = page.getByTestId('cinematic-replay-client')
  const timeline = page.getByTestId('urai-replay-timeline')
  const meta = page.getByTestId('urai-replay-meta-panel')

  await expect(replay).toBeVisible()
  await expect(replay).toHaveAttribute('data-replay-phase', 'replay_playing')
  await expect(timeline).toBeVisible()
  await expect(meta).toBeVisible()
  await expect(meta).toContainText('Pattern Replay')
  await expect(meta).toContainText('Replay · Seed Memory Bloom')

  await page.getByRole('button', { name: /Pause replay|Pause/i }).first().click()
  await expect(replay).toHaveAttribute('data-replay-phase', /replay_paused|replay_ready/)

  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/focus\?manifestId=seed-memory-bloom/)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/replay?manifestId=${seed}`)
  await expect(page.getByTestId('cinematic-replay-client')).toBeVisible()
  await expect(page.getByTestId('urai-replay-timeline')).toBeVisible()
  await expect(page.getByTestId('urai-replay-meta-panel')).toBeVisible()

  expect(consoleErrors).toEqual([])
})
