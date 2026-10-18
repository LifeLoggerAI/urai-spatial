import { test, expect } from '@playwright/test'
/**
 * ORIGINAL APPLICATION browser proof only. Never substitute mock HTML, fake voices,
 * prerecorded answers, or a disabled WebGL renderer. Requires an actually running
 * exact-head UrAi Next application at URAI_PROOF_BASE_URL.
 */
const origin = process.env.URAI_PROOF_BASE_URL || 'http://127.0.0.1:4290'
test.use({ viewport: { width: 1280, height: 800 }, permissions: [] })
test('Council original scene renders, moves and maintains truthful character encounter', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(new URL('/council', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const realm = page.locator('[data-spatial-realm="council"]')
  await expect(realm).toBeVisible({ timeout: 45000 })
  await expect(realm).toHaveAttribute('data-council-embodied', 'true')
  await expect(realm).toHaveAttribute('data-digital-human-integration', 'rigged-council-preview-no-founder-likeness')
  await expect(realm.locator('canvas')).toBeVisible({ timeout: 45000 })
  await expect(realm).toHaveAttribute('data-council-human-authority','human-makehuman-v4-preview')
  await expect(realm).toHaveAttribute('data-digital-human-near', /true|false/)
  const before = await realm.getAttribute('data-council-camera-z')
  await page.keyboard.down('w')
  await page.waitForTimeout(1500)
  await page.keyboard.up('w')
  await expect.poll(() => realm.getAttribute('data-council-camera-z'), { timeout: 15000 }).not.toBe(before)
  const after = await realm.getAttribute('data-council-camera-z')
  await expect(page.getByTestId('council-human-distance')).toContainText('No private likeness or character voice is approved here')
  await expect(page.locator('[data-provider]')).toHaveAttribute('data-provider', 'idle')
  await expect(page.getByLabel('Council provider')).toBeVisible()
  const evidence = { classification: 'ORIGINAL_COUNCIL_BROWSER_SCENE_NO_PROVIDER_OR_VOICE_PROOF', head: process.env.URAI_EXACT_HEAD ?? 'unverified',
    before, after, near: await realm.getAttribute('data-digital-human-near'), errors }
  await testInfo.attach('actual-council-browser.json', { body: JSON.stringify(evidence), contentType: 'application/json' })
  await testInfo.attach('actual-council-browser.png', { body: await page.screenshot({ animations:'disabled' }), contentType:'image/png' })
  expect(errors).toEqual([])
})
test('reduced-motion Council uses the original semantic encounter controls', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(new URL('/council', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await expect(page.locator('[data-spatial-realm="council"]')).toBeVisible({ timeout: 45000 })
  await expect(page.getByLabel('Use nonspatial Council text interaction')).toBeVisible()
  await page.getByLabel('Use nonspatial Council text interaction').check()
  await expect(page.getByLabel('Council provider')).toBeVisible()
  await expect(page.getByRole('button',{name:'Ask Council'})).toBeDisabled()
  await testInfo.attach('reduced-motion-council.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'})
})

test('WebGL unavailable leaves original Council text conversation and all six presences reachable', async ({ page }, info) => {
  // Remove only WebGL, not canvas 2D or the actual production route. No mock Council UI.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: function (kind: string, ...args: unknown[]) {
        if (kind === 'webgl' || kind === 'webgl2') return null
        return Reflect.apply(original, this, [kind, ...args])
      },
    })
  })
  await page.goto(new URL('/council', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const fallback = page.getByTestId('urai-council-semantic-fallback')
  await expect(fallback).toBeVisible({ timeout: 45000 })
  await expect(fallback).toHaveAttribute('data-council-renderer', 'unavailable')
  await expect(fallback.locator('canvas')).toHaveCount(0)
  const textPanel = page.getByTestId('urai-council-text-fallback')
  await expect(textPanel).toBeVisible()
  await expect(textPanel).toContainText('No private likeness or character voice is approved here.')
  const presence = page.getByRole('combobox', { name: 'Council presence' })
  await expect(presence.locator('option')).toHaveCount(6)
  await presence.selectOption('council-archivist')
  await expect(page.getByRole('textbox', { name: 'Ask The Archivist' })).toBeVisible()
  await expect(page.getByLabel('Council provider')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ask Council' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Return Home' })).toBeVisible()
  await info.attach('webgl-denied-original-council-text.json', {
    body: JSON.stringify({ classification: 'ORIGINAL_ROUTE_WEBGL_DENIED_TEXT_ONLY_NOT_PROVIDER_PROOF',
      head: process.env.URAI_EXACT_HEAD ?? 'unverified', selection: await presence.inputValue(),
      renderer: await fallback.getAttribute('data-council-renderer') }),
    contentType: 'application/json',
  })
})
