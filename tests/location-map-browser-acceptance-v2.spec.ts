import { expect, test, type Page, type TestInfo } from '@playwright/test'

const route = '/location-map/?privacyMode=private&entryPortal=location-beacon&cameraCheckpoint=atlas-world-view'

type Evidence = { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] }

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

async function dispatchPointerDrag(page: Page, pointerType: 'mouse' | 'touch', dx: number, dy: number) {
  const box = await page.locator('.locationAtlasStage').boundingBox()
  expect(box).not.toBeNull()
  const x = box!.x + box!.width * .5
  const y = box!.y + box!.height * .5

  if (pointerType === 'mouse') {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 8 })
    await page.mouse.up()
    return
  }

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function touchSelectFirstBeacon(page: Page) {
  const box = await page.locator('.locationAtlasBeacon').first().boundingBox()
  expect(box).not.toBeNull()
  const x = box!.x + box!.width * .5
  const y = box!.y + box!.height * .5
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test.describe('Location Map exact-head browser acceptance evidence v2', () => {
  test('desktop complete acceptance packet', async ({ page, context }, testInfo) => {
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
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-overview.png'), fullPage: true })

    const beforePan = await camera(page)
    await dispatchPointerDrag(page, 'mouse', 140, 80)
    await expect.poll(async () => camera(page)).not.toEqual(beforePan)
    const afterPan = await camera(page)

    await stage.evaluate(element => element.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -520 })))
    await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(afterPan.zoom)
    const afterWheel = await camera(page)

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
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByText('Offline · local view retained')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('offline-desktop.png'), fullPage: true })
    await context.setOffline(false)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.locationAtlas')).toHaveAttribute('data-reduced-motion', 'true')
    expect(await page.locator('.locationAtlasBeacons').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
    await page.screenshot({ path: testInfo.outputPath('reduced-motion-desktop.png'), fullPage: true })

    expect(errors.consoleErrors).toEqual([])
    expect(errors.pageErrors).toEqual([])
    expect(errors.failedRequests).toEqual([])
    await attachJson(testInfo, 'desktop-console-network-receipt.json', errors)
    await attachJson(testInfo, 'desktop-interaction-receipt.json', { beforePan, afterPan, afterWheel, selectedUrl })
  })

  test('mobile touch drag and touch selection packet', async ({ page }, testInfo) => {
    const errors = monitor(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => localStorage.setItem('urai:locationMapDemoMode', 'true'))
    await page.goto(route, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-location-map-source="disclosed-demo"]')).toBeVisible()

    const beforeTouch = await camera(page)
    await dispatchPointerDrag(page, 'touch', 72, 54)
    await expect.poll(async () => camera(page)).not.toEqual(beforeTouch)
    const afterTouch = await camera(page)

    await touchSelectFirstBeacon(page)
    await expect(page.locator('.locationAtlasSelection')).toBeVisible()
    await expect(page).toHaveURL(/placeId=/)
    await page.screenshot({ path: testInfo.outputPath('demo-mobile-selected.png'), fullPage: true })

    expect(errors.consoleErrors).toEqual([])
    expect(errors.pageErrors).toEqual([])
    expect(errors.failedRequests).toEqual([])
    await attachJson(testInfo, 'mobile-console-network-receipt.json', errors)
    await attachJson(testInfo, 'mobile-interaction-receipt.json', { beforeTouch, afterTouch })
  })
})
