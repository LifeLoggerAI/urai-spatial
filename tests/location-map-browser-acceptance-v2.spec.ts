import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

const route = '/location-map/?privacyMode=private&entryPortal=location-beacon&cameraCheckpoint=atlas-world-view'

type Evidence = { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] }
type ScreenPoint = { x: number; y: number }

function monitor(page: Page): Evidence {
  const evidence: Evidence = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on('console', message => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()) })
  page.on('pageerror', error => evidence.pageErrors.push(error.message))
  page.on('requestfailed', request => evidence.failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`))
  return evidence
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, { body: Buffer.from(JSON.stringify(value, null, 2)), contentType: 'application/json' })
}

async function camera(page: Page) {
  return page.locator('.locationAtlas').evaluate(element => ({
    x: getComputedStyle(element).getPropertyValue('--atlas-x').trim(),
    y: getComputedStyle(element).getPropertyValue('--atlas-y').trim(),
    zoom: Number(getComputedStyle(element).getPropertyValue('--atlas-zoom')),
  }))
}

async function cameraTransform(page: Page) {
  return page.locator('.locationAtlasBeacons').evaluate(element => getComputedStyle(element).transform)
}

async function openDemo(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('urai:userId')
    localStorage.removeItem('urai:locationMapDemoMode')
  })
  await page.goto(route, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Your places stay closed until you open them.' })).toBeVisible()
  await page.getByRole('button', { name: 'Open disclosed sample' }).click()
  await expect(page.locator('[data-location-map-source="disclosed-demo"]')).toBeVisible()
}

async function gestureAnchor(page: Page): Promise<ScreenPoint> {
  const box = await page.locator('.locationAtlasStage').boundingBox()
  expect(box).not.toBeNull()
  const candidates = [
    { x: box!.x + box!.width * .50, y: box!.y + box!.height * .50 },
    { x: box!.x + box!.width * .30, y: box!.y + box!.height * .42 },
    { x: box!.x + box!.width * .70, y: box!.y + box!.height * .42 },
    { x: box!.x + box!.width * .50, y: box!.y + box!.height * .68 },
  ]
  for (const candidate of candidates) {
    const blocked = await page.evaluate(({ x, y }) => {
      const node = document.elementFromPoint(x, y)
      return Boolean(node instanceof HTMLElement && node.closest('button,a,[data-atlas-panel]'))
    }, candidate)
    if (!blocked) return candidate
  }
  throw new Error('No unobstructed native gesture anchor was available in the Location Map stage')
}

async function nativeTouchTap(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  expect(box).not.toBeNull()
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    const x = box!.x + box!.width * .5
    const y = box!.y + box!.height * .5
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}

async function dispatchPointerDrag(page: Page, pointerType: 'mouse' | 'touch', dx: number, dy: number) {
  const { x, y } = await gestureAnchor(page)
  if (pointerType === 'mouse') {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 8 })
    await page.mouse.up()
    return
  }

  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] })
    for (let step = 1; step <= 8; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * step) / 8, y: y + (dy * step) / 8, id: 1, radiusX: 6, radiusY: 6, force: 1 }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}

async function nativePinch(page: Page) {
  const anchor = await gestureAnchor(page)
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: anchor.x - 34, y: anchor.y, id: 1, radiusX: 6, radiusY: 6, force: 1 },
        { x: anchor.x + 34, y: anchor.y, id: 2, radiusX: 6, radiusY: 6, force: 1 },
      ],
    })
    for (let step = 1; step <= 8; step += 1) {
      const spread = 34 + step * 5
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: anchor.x - spread, y: anchor.y, id: 1, radiusX: 6, radiusY: 6, force: 1 },
          { x: anchor.x + spread, y: anchor.y, id: 2, radiusX: 6, radiusY: 6, force: 1 },
        ],
      })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}

async function realWheelZoom(page: Page) {
  const { x, y } = await gestureAnchor(page)
  await page.mouse.move(x, y)
  await page.mouse.wheel(0, -520)
}

test.describe('Location Map exact-head browser acceptance evidence v2', () => {
  test('desktop complete acceptance packet', async ({ page, context }, testInfo) => {
    test.setTimeout(120_000)
    const errors = monitor(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-private-memory-mounted="false"]')).toBeVisible()
    await expect(page.getByText('No personal place history is mounted while signed out.')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('signed-out-desktop.png'), fullPage: true })

    await openDemo(page)
    const atlas = page.locator('[data-location-map-source="disclosed-demo"]')
    const stage = page.locator('.locationAtlasStage')
    const beacons = page.locator('.locationAtlasBeacon')
    expect(await beacons.count()).toBeGreaterThan(0)
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-standard-overview.png'), fullPage: true })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-wide-overview.png'), fullPage: true })
    await page.setViewportSize({ width: 1440, height: 900 })

    const beforePan = await camera(page)
    const beforePanTransform = await cameraTransform(page)
    await dispatchPointerDrag(page, 'mouse', 140, 80)
    await expect.poll(async () => camera(page)).not.toEqual(beforePan)
    await expect.poll(async () => cameraTransform(page)).not.toBe(beforePanTransform)
    const afterPan = await camera(page)
    const afterPanTransform = await cameraTransform(page)

    await realWheelZoom(page)
    await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(afterPan.zoom)
    const afterWheel = await camera(page)
    expect(afterWheel.x).toBe(afterPan.x)
    expect(afterWheel.y).toBe(afterPan.y)

    await beacons.first().click()
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
    await expect(page.locator('.locationAtlasSelection')).toBeVisible()
    await expect(page).toHaveURL(/placeId=/)
    const selectedUrl = page.url()
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-selected.png'), fullPage: true })

    await page.goBack()
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'atlas-world-view')
    await page.goForward()
    await expect(page).toHaveURL(selectedUrl)
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('[data-camera-checkpoint="place-focus"]')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('.locationAtlasSelection')).toBeHidden()
    await expect(page.getByText('Atlas overview', { exact: true })).toBeVisible()
    await expect(page).not.toHaveURL(/placeId=/)
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-deselected.png'), fullPage: true })
    await stage.focus()
    await page.keyboard.press('ArrowRight')
    await expect(beacons.nth(1)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.locationAtlasSelection')).toBeVisible()
    await page.keyboard.press('Home')
    await expect(page.locator('.locationAtlasSelection')).toBeHidden()
    await expect(page.getByText('Atlas overview', { exact: true })).toBeVisible()

    await page.evaluate(() => localStorage.setItem('urai:userId', 'acceptance-user'))
    await page.goto(`${route}&acceptanceState=private`, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-location-map-source="private-repository"]')).toBeVisible()
    await expect(page.getByText('Permissioned places')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('private-user-desktop.png'), fullPage: true })

    await page.goto(`${route}&acceptanceState=empty`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Your atlas is quiet.' })).toBeVisible()
    await expect(page.getByText('Nothing private has been inferred.')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('empty-state-desktop.png'), fullPage: true })

    await openDemo(page)
    const offlineStart = {
      consoleErrors: errors.consoleErrors.length,
      pageErrors: errors.pageErrors.length,
      failedRequests: errors.failedRequests.length,
    }
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.evaluate(() => fetch(`/location-map/offline-probe-${Date.now()}`).catch(() => undefined))
    await expect(page.getByText('Offline · local view retained')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('offline-desktop.png'), fullPage: true })
    await context.setOffline(false)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.locationAtlas')).toHaveAttribute('data-reduced-motion', 'true')
    const motionStyles = await page.locator('.locationAtlasBeacon, .locationAtlasSelection, .locationAtlasBeacons').evaluateAll(elements => elements.map(element => ({
      transitionDuration: getComputedStyle(element).transitionDuration,
      animationDuration: getComputedStyle(element).animationDuration,
    })))
    expect(motionStyles.every(style => style.transitionDuration.split(',').every(value => value.trim() === '0s') && style.animationDuration.split(',').every(value => value.trim() === '0s'))).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('reduced-motion-desktop.png'), fullPage: true })

    const expectedOfflineConsoleErrors = errors.consoleErrors.slice(offlineStart.consoleErrors)
    const unexpectedConsoleErrors = errors.consoleErrors.slice(0, offlineStart.consoleErrors)
    const expectedOfflinePageErrors = errors.pageErrors.slice(offlineStart.pageErrors)
    const unexpectedPageErrors = errors.pageErrors.slice(0, offlineStart.pageErrors)
    const expectedOfflineRequests = errors.failedRequests.slice(offlineStart.failedRequests)
    const unexpectedFailedRequests = errors.failedRequests.slice(0, offlineStart.failedRequests)
    const expectedOfflineSignals = expectedOfflineConsoleErrors.length + expectedOfflinePageErrors.length + expectedOfflineRequests.length
    expect(expectedOfflineSignals).toBeGreaterThan(0)
    expect(unexpectedConsoleErrors).toEqual([])
    expect(unexpectedPageErrors).toEqual([])
    expect(unexpectedFailedRequests).toEqual([])
    await attachJson(testInfo, 'desktop-console-network-receipt.json', {
      ...errors,
      expectedOfflineConsoleErrors,
      expectedOfflinePageErrors,
      expectedOfflineRequests,
      unexpectedConsoleErrors,
      unexpectedPageErrors,
      unexpectedFailedRequests,
    })
    await attachJson(testInfo, 'desktop-interaction-receipt.json', {
      exactSha: process.env.URAI_EXACT_HEAD || process.env.GITHUB_SHA || 'local',
      beforePan,
      beforePanTransform,
      afterPan,
      afterPanTransform,
      afterWheel,
      selectedUrl,
      motionStyles,
      viewports: ['1440x900', '1920x1080'],
    })
  })

  test('mobile native touch drag pinch continuation selection and deselection packet', async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'CDP native touch input requires Chromium')
    const errors = monitor(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => localStorage.setItem('urai:locationMapDemoMode', 'true'))
    await page.goto(route, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-location-map-source="disclosed-demo"]')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('demo-mobile-overview.png'), fullPage: true })

    const beforeTouch = await camera(page)
    const beforeTouchTransform = await cameraTransform(page)
    await dispatchPointerDrag(page, 'touch', 72, 54)
    await expect.poll(async () => camera(page)).not.toEqual(beforeTouch)
    await expect.poll(async () => cameraTransform(page)).not.toBe(beforeTouchTransform)
    const afterTouch = await camera(page)
    const afterTouchTransform = await cameraTransform(page)

    await nativePinch(page)
    await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(afterTouch.zoom)
    const afterPinch = await camera(page)
    await dispatchPointerDrag(page, 'touch', 64, 46)
    await expect.poll(async () => {
      const value = await camera(page)
      return `${value.x}:${value.y}`
    }).not.toBe(`${afterPinch.x}:${afterPinch.y}`)
    const afterPinchToPan = await camera(page)
    const afterPinchToPanTransform = await cameraTransform(page)

    await page.keyboard.press('Home')
    await expect(page.getByText('Atlas overview', { exact: true })).toBeVisible()
    await nativeTouchTap(page, page.locator('.locationAtlasBeacon').first())
    await expect(page.locator('.locationAtlasSelection')).toBeVisible()
    await expect(page).toHaveURL(/placeId=/)
    await page.screenshot({ path: testInfo.outputPath('demo-mobile-selected.png'), fullPage: true })

    const selection = page.locator('.locationAtlasSelection')
    await nativeTouchTap(page, selection.getByRole('button', { name: 'Return to atlas overview' }))
    await expect(selection).toBeHidden()
    await expect(page).not.toHaveURL(/placeId=/)
    await page.screenshot({ path: testInfo.outputPath('demo-mobile-deselected.png'), fullPage: true })

    expect(errors.consoleErrors).toEqual([])
    expect(errors.pageErrors).toEqual([])
    expect(errors.failedRequests).toEqual([])
    await attachJson(testInfo, 'mobile-console-network-receipt.json', errors)
    await attachJson(testInfo, 'mobile-interaction-receipt.json', {
      exactSha: process.env.URAI_EXACT_HEAD || process.env.GITHUB_SHA || 'local',
      beforeTouch,
      beforeTouchTransform,
      afterTouch,
      afterTouchTransform,
      afterPinch,
      afterPinchToPan,
      afterPinchToPanTransform,
      viewport: '390x844',
      nativeInput: ['touch-drag', 'two-finger-pinch', 'post-pinch-one-finger-pan', 'touch-select', 'touch-deselect'],
    })
  })
})
