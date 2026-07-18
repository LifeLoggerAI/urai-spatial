import { expect, test } from '@playwright/test'

const LOCKED_MEMORY = 'forecast-path'
const FOCUS_LOCKED_PATH = `/focus?memoryId=${LOCKED_MEMORY}&manifestId=replay-recovery-thread&node=${LOCKED_MEMORY}&demo=1`
const LIFE_MAP_LOCKED_PATH = `/life-map?memoryId=demo%3A${LOCKED_MEMORY}&manifestId=replay-recovery-thread&node=${LOCKED_MEMORY}&demo=1`
const REPLAY_LOCKED_PATH = `/replay?memoryId=${LOCKED_MEMORY}&manifestId=replay-recovery-thread&node=${LOCKED_MEMORY}&demo=1`
const REPLAY_SENTINEL_PATH = `/replay?memoryId=${LOCKED_MEMORY}&manifestId=replay-unavailable&node=${LOCKED_MEMORY}&demo=1`

test.describe('Replay authorization boundary', () => {
  test('semantic Life Map and Focus disable Replay for a locked demo memory', async ({ page }) => {
    await page.goto(LIFE_MAP_LOCKED_PATH, { waitUntil: 'domcontentloaded' })
    const semanticControls = page.getByTestId('urai-lifemap-selected-memory-controls')
    await expect(semanticControls).toBeVisible()
    await expect(semanticControls.getByRole('button', { name: 'Forecast Path', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const railReplay = semanticControls.getByRole('button', { name: /replay unavailable for this memory/i })
    await expect(railReplay).toBeDisabled()

    await page.goto(FOCUS_LOCKED_PATH, { waitUntil: 'domcontentloaded' })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"][data-memory-status="demo"]')
    await expect(chamber).toBeVisible()
    await expect(chamber).toHaveAttribute('data-memory-id', 'demo:forecast-path')
    const focusReplay = chamber.getByRole('button', { name: /open replay for forecast path/i })
    await expect(focusReplay).toBeDisabled()
    await expect(focusReplay).toContainText(/Replay not available|Stay with this memory/i)
  })

  for (const path of [REPLAY_LOCKED_PATH, REPLAY_SENTINEL_PATH]) {
    test(`direct Replay URL fails closed: ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const replay = page.getByTestId('cinematic-replay-client')
      await expect(replay).toBeVisible()
      await expect(replay).toHaveAttribute('data-memory-status', 'unavailable')
      await expect(replay.getByRole('alert')).toContainText(/Replay is unavailable for this memory/i)
      await expect(page.locator('.replayWorld')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /play replay|pause replay/i })).toHaveCount(0)
    })
  }
})
