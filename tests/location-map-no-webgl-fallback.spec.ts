import { expect, test } from '@playwright/test'

const route = '/location-map/?privacyMode=private&entryPortal=location-beacon&cameraCheckpoint=atlas-world-view'

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
}

test('authored no-WebGL fallback preserves the real atlas interaction contract', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function patched(type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.call(this, type, ...args)
    }
  })

  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'Your places stay closed until you open them.' })).toBeVisible()
  await page.getByRole('button', { name: 'Open disclosed sample' }).click()

  const atlas = page.locator('[data-location-map-source="disclosed-demo"]')
  await expect(atlas).toBeVisible()
  const fallback = page.getByTestId('location-map-no-webgl-fallback')
  await expect(fallback).toBeVisible()
  await expect(fallback).toHaveAttribute('data-webgl-state', 'unavailable')
  await expect(fallback).toHaveAttribute('data-location-world-owner', 'authored-two-dimensional-emotional-geography')
  await expect(page.getByTestId('location-map-r3f-world')).toHaveCount(0)

  const beacons = page.locator('.locationAtlasBeacon')
  expect(await beacons.count()).toBeGreaterThan(0)
  await beacons.first().click()
  await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'place-focus')
  const selection = page.locator('.locationAtlasSelection')
  await expect(selection).toBeVisible()
  await expect(page).toHaveURL(/placeId=/)

  const bridgeBox = await page.locator('.locationMapGeographicBridge').boundingBox()
  const selectionBox = await selection.boundingBox()
  expect(bridgeBox).not.toBeNull()
  expect(selectionBox).not.toBeNull()
  expect(intersects(bridgeBox!, selectionBox!)).toBe(false)

  await page.screenshot({ path: testInfo.outputPath('no-webgl-selected.png'), fullPage: true })

  await page.keyboard.press('Escape')
  await expect(selection).toBeHidden()
  await expect(atlas).toHaveAttribute('data-camera-checkpoint', 'atlas-world-view')
  await expect(page).not.toHaveURL(/placeId=/)
  await page.screenshot({ path: testInfo.outputPath('no-webgl-overview.png'), fullPage: true })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
