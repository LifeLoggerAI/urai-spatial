import { expect, test, type Page, type TestInfo } from '@playwright/test'

const route = '/location-map/?privacyMode=private&entryPortal=location-beacon&cameraCheckpoint=atlas-world-view'

function monitor(page: Page) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`))

  return { consoleErrors, pageErrors, failedRequests }
}

async function attachReceipt(testInfo: TestInfo, name: string, receipt: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(receipt, null, 2)),
    contentType: 'application/json',
  })
}

async function openDemo(page: Page) {
  await page.goto(route, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Your places stay closed until you open them.' })).toBeVisible()
  await page.getByRole('button', { name: 'Open disclosed sample' }).click()
  await expect(page.locator('[data-location-map-source="disclosed-demo"]')).toBeVisible()
}

test.describe('Location Map browser acceptance evidence', () => {
  test('desktop interaction, route restoration, privacy boundaries, offline and reduced motion', async ({ page, context }, testInfo) => {
    const evidence = monitor(page)

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-private-memory-mounted="false"]')).toBeVisible()
    await expect(page.getByText('No personal place history is mounted while signed out.')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('signed-out-desktop.png'), fullPage: true })

    await openDemo(page)
    const atlas = page.locator('[data-location-map-source="disclosed-demo"]')
    const stage = page.locator('.locationAtlasStage')
    const beacons = page.locator('.locationAtlasBeacon')
    await expect(beacons).toHaveCount(6)
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-overview.png'), fullPage: true })

    const beforePan = await atlas.evaluate(element => ({
      x: getComputedStyle(element).getPropertyValue('--atlas-x'),
      y: getComputedStyle(element).getPropertyValue('--atlas-y'),
      zoom: getComputedStyle(element).getPropertyValue('--atlas-zoom'),
    }))
    const box = await stage.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width * .5, box!.y + box!.height * .5)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * .62, box!.y + box!.height * .58, { steps: 8 })
    await page.mouse.up()
    const afterPan = await atlas.evaluate(element => ({
      x: getComputedStyle(element).getPropertyValue('--atlas-x'),
      y: getComputedStyle(element).getPropertyValue('--atlas-y'),
    }))
    expect(afterPan).not.toEqual({ x: beforePan.x, y: beforePan.y })

    await page.mouse.move(box!.x + box!.width * .5, box!.y + box!.height * .5)
    await page.mouse.wheel(0, -520)
    await expect.poll(async () => Number(await atlas.evaluate(element => getComputedStyle(element).getPropertyValue('--atlas-zoom')))).toBeGreaterThan(Number(beforePan.zoom))

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
    await expect(page.locator('[data-camera-checkpoint="atlas-world-view"]')).toBeVisible()
    await stage.focus()
    await page.keyboard.press('ArrowRight')
    await expect(beacons.nth(1)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-camera-checkpoint="place-focus"]')).toBeVisible()
    await page.keyboard.press('Home')
    await expect(page.locator('[data-camera-checkpoint="atlas-world-view"]')).toBeVisible()

    await page.evaluate(() => localStorage.setItem('urai:userId', 'acceptance-user'))
    await page.goto(`${route}&acceptanceState=private`, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-location-map-source="private-repository"]')).toBeVisible()
    await expect(page.getByText('Private atlas', { exact: true }).first()).toBeVisible()
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
    await expect(atlas).toHaveAttribute('data-reduced-motion', 'true')
    const transition = await page.locator('.locationAtlasBeacons').evaluate(element => getComputedStyle(element).transitionDuration)
    expect(transition).toBe('0s')
    await page.screenshot({ path: testInfo.outputPath('reduced-motion-desktop.png'), fullPage: true })

    expect(evidence.consoleErrors).toEqual([])
    expect(evidence.pageErrors).toEqual([])
    expect(evidence.failedRequests).toEqual([])
    await attachReceipt(testInfo, 'desktop-console-network-receipt.json', evidence)
  })

  test('mobile touch drag and touch selection', async ({ page }, testInfo) => {
    const evidence = monitor(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => localStorage.setItem('urai:locationMapDemoMode', 'true'))
    await page.goto(route, { waitUntil: 'networkidle' })

    const atlas = page.locator('[data-location-map-source="disclosed-demo"]')
    const stage = page.locator('.locationAtlasStage')
    const before = await atlas.evaluate(element => ({
      x: getComputedStyle(element).getPropertyValue('--atlas-x'),
      y: getComputedStyle(element).getPropertyValue('--atlas-y'),
    }))
    const box = await stage.boundingBox()
    expect(box).not.toBeNull()
    const startX = box!.x + box!.width * .52
    const startY = box!.y + box!.height * .48
    await stage.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: startX, clientY: startY, buttons: 1 })
    await stage.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: startX + 58, clientY: startY + 44, buttons: 1 })
    await stage.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: startX + 58, clientY: startY + 44, buttons: 0 })
    const after = await atlas.evaluate(element => ({
      x: getComputedStyle(element).getPropertyValue('--atlas-x'),
      y: getComputedStyle(element).getPropertyValue('--atlas-y'),
    }))
    expect(after).not.toEqual(before)

    await page.locator('.locationAtlasBeacon').first().tap()
    await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
    await expect(page.locator('.locationAtlasSelection')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('demo-mobile-selected.png'), fullPage: true })

    expect(evidence.consoleErrors).toEqual([])
    expect(evidence.pageErrors).toEqual([])
    expect(evidence.failedRequests).toEqual([])
    await attachReceipt(testInfo, 'mobile-console-network-receipt.json', evidence)
  })
})
