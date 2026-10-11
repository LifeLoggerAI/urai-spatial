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

    await page.evaluate(() => document.fonts.ready)
    const context = replay.locator('.replayMemoryContext')
    await expect(context.getByText('Sample', { exact: true })).toBeVisible()
    await expect(context.locator('time')).toHaveAttribute('datetime', '2026-05-09T12:00:00.000Z')
    await expect(context.locator('time')).toContainText('2026')
    await expect(context.getByText('Example place', { exact: true })).toBeVisible()
    await expect(context.locator('.replaySequence')).toHaveText('1 / 4 · Memory')
    await replay.locator('.replayProduct > summary').click()
    await expect(replay.getByRole('button', { name: 'Continue Life Movie', exact: true })).toHaveCount(1)
    await expect(replay.locator('.replayProductActions a[href*="life-movie"]')).toHaveCount(0)
    await expect(replay.locator('.replayProductActions').getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
    await replay.locator('.replayProduct > summary').click()

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
    const playBeforeSeek = await play.boundingBox()
    await page.keyboard.press('Tab')
    await expect(seek).toBeFocused()
    const playDuringSeek = await play.boundingBox()
    expect(playDuringSeek!.x).toBeCloseTo(playBeforeSeek!.x, 1)
    expect(playDuringSeek!.y).toBeCloseTo(playBeforeSeek!.y, 1)
    expect(playDuringSeek!.height).toBeGreaterThanOrEqual(48)
    const seekRect = await seek.boundingBox()
    expect(seekRect!.height).toBeGreaterThanOrEqual(48)
    expect(seekRect!.x).toBeGreaterThanOrEqual(0)
    expect(seekRect!.x + seekRect!.width).toBeLessThanOrEqual(391)
    await seek.press('End')
    await expect(replay).toHaveAttribute('data-current-time-ms', '12000')
    await expect(context.locator('.replaySequence')).toHaveText('4 / 4 · Return')
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

  test('one Life Movie continuation preserves selected memory and current movie chapter', async ({ page }) => {
    await disableWebGL(page)
    await page.addInitScript(() => {
      window.addEventListener('urai:world-travel', event => {
        const detail = (event as CustomEvent).detail
        if (detail?.destination === 'life-movie') sessionStorage.setItem('replay-test-life-movie-travel', JSON.stringify(detail))
      })
    })
    await page.goto(replayDemo + '&movieId=demo-continuum&chapterId=demo-reset-chapter', { waitUntil: 'domcontentloaded' })
    const replay = page.getByTestId('cinematic-replay-client')
    await expect(replay).toHaveAttribute('data-replay-media-ready', 'true')
    await replay.locator('.replayProduct > summary').click()
    await expect(replay.getByRole('button', { name: 'Continue Life Movie', exact: true })).toHaveCount(1)
    await expect(replay.locator('.replayProductActions a[href*="life-movie"]')).toHaveCount(0)
    await replay.locator('.replayProduct > summary').click()
    await replay.getByRole('button', { name: 'Continue Life Movie', exact: true }).click()
    await expect.poll(async () => new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/life-movie')
    const destination = new URL(page.url())
    expect(destination.searchParams.get('memoryId')).toBe('demo:quiet-reset')
    expect(destination.searchParams.get('manifestId')).toBe('replay-recovery-thread')
    expect(destination.searchParams.get('movieId')).toBe('demo-continuum')
    expect(destination.searchParams.get('chapterId')).toBe('demo-reset-chapter')
    const travel = await page.evaluate(() => JSON.parse(sessionStorage.getItem('replay-test-life-movie-travel') || 'null'))
    expect(travel.context).toMatchObject({ memoryId: 'demo:quiet-reset', replayManifestId: 'replay-recovery-thread', movieId: 'demo-continuum', chapterId: 'demo-reset-chapter' })
    expect(travel.entryPortal).toBe('replay-life-movie-threshold')
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

for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 568, height: 320 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`Replay captions stay clear of transport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(replayDemo, { waitUntil: 'domcontentloaded' })
    const replay = page.getByTestId('cinematic-replay-client')
    await expect(replay).toHaveAttribute('data-replay-media-ready', 'true')
    await expect(replay).toHaveAttribute('data-webgl-state', 'ready')
    await expect(replay.locator('canvas')).toHaveAttribute('data-replay-first-frame', 'true')
    await page.evaluate(() => document.fonts.ready)
    // Read one simultaneous layout snapshot instead of three forced GPU frames.
    const { caption, tempo, header } = await replay.evaluate(owner => {
      const rect = (selector: string) => {
        const element = owner.querySelector(selector)
        if (!element) return null
        const r = element.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      }
      return { caption: rect('.caption'), tempo: rect('.memoryTempo'), header: rect('header') }
    })
    await test.info().attach('replay-control-geometry.json', { body: JSON.stringify({ viewport, caption, tempo, header }), contentType: 'application/json' })
    expect(caption).not.toBeNull()
    expect(tempo).not.toBeNull()
    expect(header).not.toBeNull()
    // Keep the original landscape clearance gate; desktop needs an explicit gap.
    expect(caption!.y + caption!.height + (viewport.height > 500 ? 8 : 0)).toBeLessThanOrEqual(tempo!.y)
    if (viewport.height <= 500) expect(header!.x + header!.width).toBeLessThanOrEqual(caption!.x)
    else expect(header!.y + header!.height).toBeLessThanOrEqual(caption!.y)
    for (const rect of [caption!, tempo!, header!]) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width)
      expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height)
    }
    if (viewport.width <= 390) {
      await replay.locator('.transcript > summary').click()
      const expanded = await replay.evaluate(owner => {
        const rect = (selector: string) => {
          const r = owner.querySelector(selector)!.getBoundingClientRect()
          return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom, right:r.right }
        }
        return { header:rect('header'), copy:rect('.transcript[open] p'), caption:rect('.caption') }
      })
      await test.info().attach('replay-expanded-transcript-geometry.json', { body:JSON.stringify({viewport,...expanded}), contentType:'application/json' })
      expect(expanded.copy.height).toBeGreaterThan(0)
      expect(expanded.copy.bottom).toBeLessThanOrEqual(expanded.header.bottom)
      expect(expanded.header.bottom + 8).toBeLessThanOrEqual(expanded.caption.y)
      await replay.locator('.transcript > summary').click()
    }
    const play = replay.getByRole('button', { name: 'Continue memory', exact: true })
    await play.click()
    await expect(replay).toHaveAttribute('data-playing', 'true')
    await replay.getByRole('button', { name: 'Pause memory', exact: true }).click()
    await expect(replay).toHaveAttribute('data-playing', 'false')
    if (viewport.height <= 500) {
      const pausedAt = await replay.getAttribute('data-current-time-ms')
      await page.keyboard.press('Tab')
      const seek = replay.getByRole('slider', { name: /Move through memory time/ })
      await expect(seek).toBeFocused()
      const target = await seek.evaluate(element => {
        const r = element.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,reachable:hit===element||element.contains(hit) }
      })
      expect(target.width).toBeGreaterThanOrEqual(48)
      expect(target.height).toBeGreaterThanOrEqual(48)
      expect(target.x).toBeGreaterThanOrEqual(0)
      expect(target.y).toBeGreaterThanOrEqual(0)
      expect(target.right).toBeLessThanOrEqual(viewport.width)
      expect(target.bottom).toBeLessThanOrEqual(viewport.height)
      expect(target.reachable).toBe(true)
      await expect(replay).toHaveAttribute('data-current-time-ms', pausedAt!)
      await seek.press('End')
      await expect(replay).toHaveAttribute('data-current-time-ms', '12000')
      await seek.press('Home')
      await expect(replay).toHaveAttribute('data-current-time-ms', '0')
      await test.info().attach('replay-keyboard-seek-geometry.json', {body:JSON.stringify(target),contentType:'application/json'})
    }
  })
}
