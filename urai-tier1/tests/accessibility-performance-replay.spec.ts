import { expect, test, type Page } from '@playwright/test'

const replayDemo = '/replay?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.apply(this, [type, ...args] as Parameters<typeof original>)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}

test.describe('Replay source ownership and accessible transport', () => {
  test('missing private selection cannot inherit demonstration art or a playing receipt', async ({ page }) => {
    const demoAssetRequests: string[] = []
    page.on('request', (request) => {
      if (/replay-memory-film|replay-cinematic-stage/.test(request.url())) demoAssetRequests.push(request.url())
    })
    await disableWebGL(page)
    await page.goto('/replay?memoryId=unavailable-private-memory', { waitUntil: 'domcontentloaded' })
    const replay = page.getByTestId('cinematic-replay-client')
    await expect(replay).not.toHaveAttribute('data-memory-status', 'loading')
    await expect(replay).toHaveAttribute('data-replay-spatial-owner', 'neutral-memory-horizon')
    await expect(replay.locator('canvas, img, video')).toHaveCount(0)
    await expect(replay).not.toHaveAttribute('data-canonical-asset', /.+/)
    await expect(replay.getByRole('button', { name: 'Choose a memory', exact: true })).toBeEnabled()
    await expect(page.locator('[data-replay-phase="replay_playing"], [data-playing="true"]')).toHaveCount(0)
    expect(demoAssetRequests).toEqual([])
  })

  test('no-WebGL demo remains truthful, keyboard-operable, source-framed, and restartable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await disableWebGL(page)
    await page.goto(replayDemo, { waitUntil: 'domcontentloaded' })
    const replay = page.getByTestId('cinematic-replay-client')
    await expect(replay).toHaveAttribute('data-memory-status', 'demo')
    await expect(replay).toHaveAttribute('data-webgl-state', 'unavailable')
    await expect(replay).toHaveAttribute('data-replay-media-ready', 'true')
    await expect(replay.locator('canvas')).toHaveCount(0)
    await expect(replay.getByText('DEMO FIXTURE · NOT PERSONAL DATA', { exact: true })).toBeVisible()
    await expect(replay.locator('[data-replay-visual-owner="disclosed-demo-asset-fallback"] img')).toBeVisible()
    expect(await replay.locator('img').evaluate((image) => getComputedStyle(image).objectFit)).toBe('contain')

    const play = replay.getByRole('button', { name: 'Continue memory', exact: true })
    await play.focus()
    await play.press('Enter')
    await expect(replay).toHaveAttribute('data-playing', 'true')
    await expect.poll(async () => Number(await replay.getAttribute('data-current-time-ms'))).toBeGreaterThan(0)
    await replay.getByRole('button', { name: 'Pause memory', exact: true }).click()
    await expect(replay).toHaveAttribute('data-playing', 'false')
    const pausedAt = await replay.getAttribute('data-current-time-ms')
    await page.waitForTimeout(350)
    await expect(replay).toHaveAttribute('data-current-time-ms', pausedAt!)

    const seek = replay.getByRole('slider', { name: /Move through memory time/ })
    await seek.focus()
    await expect(seek).toBeFocused()
    const seekRect = await seek.boundingBox()
    expect(seekRect!.height).toBeGreaterThanOrEqual(48)
    expect(seekRect!.x).toBeGreaterThanOrEqual(0)
    expect(seekRect!.x + seekRect!.width).toBeLessThanOrEqual(391)
    await seek.press('End')
    await expect(replay).toHaveAttribute('data-current-time-ms', '12000')
    await replay.getByRole('button', { name: 'Continue memory', exact: true }).click()
    await expect(replay).toHaveAttribute('data-playing', 'true')
    await expect.poll(async () => Number(await replay.getAttribute('data-current-time-ms'))).toBeLessThan(2000)
    await replay.getByRole('button', { name: 'Pause memory', exact: true }).click()

    const retrySpatial = replay.getByRole('button', { name: 'Retry spatial view', exact: true })
    await retrySpatial.focus()
    await retrySpatial.press('Enter')
    await expect(replay).toHaveAttribute('data-webgl-state', 'unavailable')
    await expect(replay.locator('canvas')).toHaveCount(0)
    await expect(replay.getByRole('button', { name: 'Continue Life Movie', exact: true })).toBeEnabled()
    await expect(replay.locator('.replayImmersiveEntry').filter({ hasText: /Enter/ })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/focus')
    const destination = new URL(page.url())
    expect(destination.searchParams.get('memoryId')).toBe('demo:quiet-reset')
    expect(destination.searchParams.get('manifestId')).toBe('replay-recovery-thread')
  })

  test('demo environment decode failure is shown truthfully and explicit retry reloads it', async ({ page }) => {
    await disableWebGL(page)
    await page.route('**/replay-memory-film-main.webp', (route) => route.abort('failed'))
    await page.goto(replayDemo, { waitUntil: 'domcontentloaded' })
    const replay = page.getByTestId('cinematic-replay-client')
    await expect(replay).toHaveAttribute('data-replay-media-status', 'error')
    await expect(replay).toHaveAttribute('data-replay-media-ready', 'false')
    await expect(replay.getByRole('button', { name: 'Continue memory', exact: true })).toBeDisabled()
    await expect(replay.getByRole('button', { name: 'Retry demonstration environment', exact: true })).toBeVisible()
    await page.unroute('**/replay-memory-film-main.webp')
    await replay.getByRole('button', { name: 'Retry demonstration environment', exact: true }).click()
    await expect(replay).toHaveAttribute('data-replay-media-status', 'ready')
    await expect(replay).toHaveAttribute('data-replay-media-ready', 'true')
    await expect(replay.getByRole('button', { name: 'Continue memory', exact: true })).toBeEnabled()
  })
})

for (const viewport of [{ width: 844, height: 390 }, { width: 568, height: 320 }]) {
  test(`Replay landscape captions stay clear of transport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(replayDemo, { waitUntil: 'domcontentloaded' })
    const replay = page.getByTestId('cinematic-replay-client')
    await expect(replay).toHaveAttribute('data-replay-media-ready', 'true')
    const caption = await replay.locator('.caption').boundingBox()
    const tempo = await replay.locator('.memoryTempo').boundingBox()
    const header = await replay.locator('header').boundingBox()
    expect(caption).not.toBeNull()
    expect(tempo).not.toBeNull()
    expect(header).not.toBeNull()
    expect(caption!.y + caption!.height).toBeLessThanOrEqual(tempo!.y)
    expect(header!.x + header!.width).toBeLessThanOrEqual(caption!.x)
    for (const rect of [caption!, tempo!, header!]) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width)
      expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height)
    }
    const play = replay.getByRole('button', { name: 'Continue memory', exact: true })
    await play.click()
    await expect(replay).toHaveAttribute('data-playing', 'true')
    await replay.getByRole('button', { name: 'Pause memory', exact: true }).click()
    await expect(replay).toHaveAttribute('data-playing', 'false')
  })
}
