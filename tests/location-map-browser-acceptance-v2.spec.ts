import { expect, test, type Page, type TestInfo } from '@playwright/test'

const route = '/location-map/?privacyMode=private&entryPortal=location-beacon&cameraCheckpoint=atlas-world-view'
const exactSha = process.env.EXACT_HEAD_SHA || process.env.GITHUB_SHA || 'local-unverified'

type Evidence = { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[]; intentionalOfflineRequests: string[] }

function monitor(page: Page): Evidence {
  const evidence: Evidence = { consoleErrors: [], pageErrors: [], failedRequests: [], intentionalOfflineRequests: [] }
  let offlineExpected = false
  page.on('console', message => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()) })
  page.on('pageerror', error => evidence.pageErrors.push(error.message))
  page.on('requestfailed', request => {
    const record = `${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`
    if (offlineExpected) evidence.intentionalOfflineRequests.push(record)
    else evidence.failedRequests.push(record)
  })
  Object.defineProperty(evidence, 'setOfflineExpected', { value: (value: boolean) => { offlineExpected = value }, enumerable: false })
  return evidence
}

function setOfflineExpected(evidence: Evidence, value: boolean) {
  const setter = (evidence as Evidence & { setOfflineExpected?: (next: boolean) => void }).setOfflineExpected
  setter?.(value)
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, { body: Buffer.from(JSON.stringify(value, null, 2)), contentType: 'application/json' })
}

async function state(page: Page) {
  const atlas = page.locator('.locationAtlas')
  return atlas.evaluate(element => ({
    exactSha,
    camera: {
      x: getComputedStyle(element).getPropertyValue('--atlas-x').trim(),
      y: getComputedStyle(element).getPropertyValue('--atlas-y').trim(),
      zoom: Number(getComputedStyle(element).getPropertyValue('--atlas-zoom')),
    },
    selectedPlace: new URL(location.href).searchParams.get('placeId'),
    routeQuery: location.search,
    privacySource: element.getAttribute('data-location-map-source'),
    privacyMode: element.getAttribute('data-privacy-mode'),
    checkpoint: element.getAttribute('data-camera-checkpoint'),
    reducedMotion: element.getAttribute('data-reduced-motion') === 'true',
    online: element.getAttribute('data-online') === 'true',
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
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

async function stageCenter(page: Page) {
  const box = await page.locator('.locationAtlasStage').boundingBox()
  expect(box).not.toBeNull()
  return { x: box!.x + box!.width * .5, y: box!.y + box!.height * .5 }
}

async function nativeMouseDrag(page: Page, dx: number, dy: number) {
  const start = await stageCenter(page)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 10 })
  await page.mouse.up()
}

async function nativeTouchDrag(page: Page, dx: number, dy: number) {
  const start = await stageCenter(page)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + dx, y: start.y + dy, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function nativePinch(page: Page, spread: number) {
  const center = await stageCenter(page)
  const cdp = await page.context().newCDPSession(page)
  const initial = 34
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: center.x - initial, y: center.y, id: 1 },
    { x: center.x + initial, y: center.y, id: 2 },
  ] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [
    { x: center.x - spread, y: center.y, id: 1 },
    { x: center.x + spread, y: center.y, id: 2 },
  ] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function nativeTouchSelect(page: Page) {
  const box = await page.locator('.locationAtlasBeacon').first().boundingBox()
  expect(box).not.toBeNull()
  const cdp = await page.context().newCDPSession(page)
  const point = { x: box!.x + box!.width * .5, y: box!.y + box!.height * .5, id: 1 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test.describe('Location Map exact-head browser acceptance evidence', () => {
  test('desktop complete acceptance packet', async ({ page, context }, testInfo) => {
    const evidence = monitor(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-private-memory-mounted="false"]')).toBeVisible()
    await expect(page.getByText('No personal place history is mounted while signed out.')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('signed-out-desktop.png'), fullPage: true })

    await openDemo(page)
    const atlas = page.locator('.locationAtlas[data-location-map-source="disclosed-demo"]')
    const stage = page.locator('.locationAtlasStage')
    const beacons = page.locator('.locationAtlasBeacon')
    expect(await beacons.count()).toBeGreaterThan(0)
    const overview = await state(page)
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-overview.png'), fullPage: true })

    await nativeMouseDrag(page, 140, 80)
    await expect.poll(async () => (await state(page)).camera).not.toEqual(overview.camera)
    const afterPan = await state(page)
    await page.screenshot({ path: testInfo.outputPath('desktop-pointer-pan.png'), fullPage: true })

    const center = await stageCenter(page)
    await page.mouse.move(center.x, center.y)
    await page.mouse.wheel(0, -520)
    await expect.poll(async () => (await state(page)).camera.zoom).toBeGreaterThan(afterPan.camera.zoom)
    const afterWheel = await state(page)
    await page.screenshot({ path: testInfo.outputPath('desktop-wheel-zoom.png'), fullPage: true })

    await beacons.first().click()
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
    await expect(page.locator('.locationAtlasSelection')).toBeVisible()
    await expect(page).toHaveURL(/placeId=/)
    const selected = await state(page)
    const selectedUrl = page.url()
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-selected.png'), fullPage: true })

    await page.goBack()
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'atlas-world-view')
    const afterBack = await state(page)
    await page.goForward()
    await expect(page).toHaveURL(selectedUrl)
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
    const afterForward = await state(page)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
    const afterReload = await state(page)

    await page.keyboard.press('Escape')
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'atlas-world-view')
    await stage.focus()
    await page.keyboard.press('ArrowRight')
    await expect(beacons.nth(1)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
    await page.keyboard.press('Home')
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'atlas-world-view')
    const afterKeyboard = await state(page)

    await page.evaluate(() => localStorage.setItem('urai:userId', 'acceptance-user'))
    await page.goto(`${route}&acceptanceState=private`, { waitUntil: 'networkidle' })
    await expect(page.locator('.locationAtlas[data-location-map-source="private-repository"]')).toBeVisible()
    await expect(page.getByText('Permissioned places')).toBeVisible()
    const privateUser = await state(page)
    await page.screenshot({ path: testInfo.outputPath('private-user-desktop.png'), fullPage: true })

    await page.goto(`${route}&acceptanceState=empty`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Your atlas is quiet.' })).toBeVisible()
    await expect(page.getByText('Nothing private has been inferred.')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('empty-state-desktop.png'), fullPage: true })

    await openDemo(page)
    setOfflineExpected(evidence, true)
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('.locationAtlas')).toHaveAttribute('data-online', 'false')
    await expect(page.getByText('Offline · local view retained')).toBeVisible()
    const offline = await state(page)
    await page.screenshot({ path: testInfo.outputPath('offline-desktop.png'), fullPage: true })
    await context.setOffline(false)
    setOfflineExpected(evidence, false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.locationAtlas')).toHaveAttribute('data-reduced-motion', 'true')
    expect(await page.locator('.locationAtlasBeacons').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
    const reducedMotion = await state(page)
    await page.screenshot({ path: testInfo.outputPath('reduced-motion-desktop.png'), fullPage: true })

    expect(evidence.consoleErrors).toEqual([])
    expect(evidence.pageErrors).toEqual([])
    expect(evidence.failedRequests).toEqual([])
    await attachJson(testInfo, 'desktop-console-network-receipt.json', { exactSha, ...evidence })
    await attachJson(testInfo, 'desktop-interaction-receipt.json', { exactSha, overview, afterPan, afterWheel, selected, selectedUrl, afterBack, afterForward, afterReload, afterKeyboard, privateUser, offline, reducedMotion })
  })

  test('mobile native touch drag pinch and selection packet', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await context.newPage()
    const evidence = monitor(page)
    try {
      await page.addInitScript(() => localStorage.setItem('urai:locationMapDemoMode', 'true'))
      await page.goto(route, { waitUntil: 'networkidle' })
      const atlas = page.locator('.locationAtlas[data-location-map-source="disclosed-demo"]')
      await expect(atlas).toBeVisible()
      const beforeTouch = await state(page)
      await page.screenshot({ path: testInfo.outputPath('demo-mobile-overview.png'), fullPage: true })

      await nativeTouchDrag(page, 72, 54)
      await expect.poll(async () => (await state(page)).camera).not.toEqual(beforeTouch.camera)
      const afterTouch = await state(page)
      await page.screenshot({ path: testInfo.outputPath('mobile-touch-drag.png'), fullPage: true })

      await nativePinch(page, 82)
      await expect.poll(async () => (await state(page)).camera.zoom).toBeGreaterThan(afterTouch.camera.zoom)
      const afterPinch = await state(page)
      await page.screenshot({ path: testInfo.outputPath('mobile-pinch-zoom.png'), fullPage: true })

      await nativeTouchSelect(page)
      await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
      await expect(page.locator('.locationAtlasSelection')).toBeVisible()
      await expect(page).toHaveURL(/placeId=/)
      const selected = await state(page)
      await page.screenshot({ path: testInfo.outputPath('demo-mobile-selected.png'), fullPage: true })

      expect(evidence.consoleErrors).toEqual([])
      expect(evidence.pageErrors).toEqual([])
      expect(evidence.failedRequests).toEqual([])
      await attachJson(testInfo, 'mobile-console-network-receipt.json', { exactSha, ...evidence })
      await attachJson(testInfo, 'mobile-interaction-receipt.json', { exactSha, beforeTouch, afterTouch, afterPinch, selected })
    } finally {
      await context.close()
    }
  })
})
