import { test, expect, type Locator } from '@playwright/test'

test.use({ hasTouch: true })

async function assertPainted(target: Locator, receiptName: string) {
  await expect(target).toBeVisible()
  const result = await target.evaluate(element => {
    let left = 0, top = 0, right = innerWidth, bottom = innerHeight
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect()
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        left = Math.max(left, bounds.left + ancestor.clientLeft)
        right = Math.min(right, bounds.left + ancestor.clientLeft + ancestor.clientWidth)
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        top = Math.max(top, bounds.top + ancestor.clientTop)
        bottom = Math.min(bottom, bounds.top + ancestor.clientTop + ancestor.clientHeight)
      }
    }
    const bounds = element.getBoundingClientRect(), label = document.createRange()
    label.selectNodeContents(element)
    const textBounds = label.getBoundingClientRect()
    const hit = document.elementFromPoint((textBounds.left + textBounds.right) / 2, (textBounds.top + textBounds.bottom) / 2)
    return {
      label: element.textContent?.trim(), width: bounds.width, height: bounds.height,
      labelPainted: textBounds.width > 0 && textBounds.height > 0
        && textBounds.left >= left - 1 && textBounds.right <= right + 1
        && textBounds.top >= top - 1 && textBounds.bottom <= bottom + 1,
      targetPainted: bounds.left >= left - 1 && bounds.right <= right + 1 && bounds.top >= top - 1 && bounds.bottom <= bottom + 1,
      hitOwned: Boolean(hit && (hit === element || element.contains(hit))),
    }
  })
  await test.info().attach(`${receiptName}.json`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
  expect(result.width).toBeGreaterThanOrEqual(48)
  expect(result.height).toBeGreaterThanOrEqual(48)
  expect(result.labelPainted, `${result.label} text must be inside every clipping ancestor`).toBe(true)
  expect(result.targetPainted, `${result.label} touch target must be inside every clipping ancestor`).toBe(true)
  expect(result.hitOwned, `${result.label} must not be covered by another layer`).toBe(true)
}

test.beforeEach(async ({ page, baseURL }) => {
  if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) throw new Error('Life Map fallback acceptance is restricted to the authorized local candidate.')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('urai:onboarding:v2:complete', '1')
    // An explicit browser capability failure, not a physical-device acceptance claim.
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (/^(webgl|webgl2|experimental-webgl)$/.test(kind)) return null
      return Reflect.apply(original, this, [kind, ...args])
    } as typeof original
  })
})

test('signed-out no-WebGL actions remain unobstructed before explicit sample admission at 320 pixels', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
  const threshold = page.getByTestId('urai-life-map-signed-out-threshold')
  await expect(threshold).toHaveAttribute('data-private-memory-mounted', 'false')
  await expect(page.getByTestId('life-map-semantic-trigger')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#life-map-navigator')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  const sample = threshold.getByRole('button', { name: 'Open disclosed sample', exact: true })
  const home = threshold.getByRole('button', { name: 'Return Home', exact: true })
  // No focus, scroll or activation may conceal initial obstruction of these controls.
  await assertPainted(sample, 'signed-out-sample-initial')
  await assertPainted(home, 'signed-out-return-initial')
  await test.info().attach('signed-out-no-webgl-original.png', { body: await page.screenshot(), contentType: 'image/png' })
  await sample.tap()
  await expect.poll(() => new URL(page.url()).searchParams.get('demo')).toBe('1')
  await expect(page.locator('#life-map-navigator')).toBeVisible()
  await expect(page.locator('.life-map-semantic-result[data-life-map-node-id="voice-note-home"]')).toBeAttached()
})

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 568, height: 320 }]) {
  test(`no-WebGL selected sample keeps painted Focus actions and identity through return at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(viewport)
    await page.goto('/life-map?demo=1&overview=1', { waitUntil: 'domcontentloaded' })
    const panel = page.locator('#life-map-navigator')
    await expect(panel).toBeVisible()
    const selected = panel.locator('.life-map-semantic-result[data-life-map-node-id="voice-note-home"]')
    await selected.scrollIntoViewIfNeeded()
    await selected.tap()
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBe('voice-note-home')
    const inspector = panel.locator('aside[data-life-map-semantic-only="true"]')
    await expect(inspector).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const actions = inspector.locator('.semantic-thresholds button')
    await expect(actions).toHaveCount(3)
    for (let index = 0; index < 3; index += 1) {
      const action = actions.nth(index)
      await action.scrollIntoViewIfNeeded()
      await assertPainted(action, `fallback-action-${viewport.width}x${viewport.height}-${index}`)
    }
    const focus = actions.nth(0)
    await focus.scrollIntoViewIfNeeded()
    await assertPainted(focus, `fallback-focus-before-entry-${viewport.width}x${viewport.height}`)
    await test.info().attach(`fallback-selected-original-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot(), contentType: 'image/png' })
    await focus.focus()
    await expect(focus).toBeFocused()
    await page.keyboard.press('Enter')
    const chamber = page.getByTestId('urai-final-focus-chamber')
    await expect(chamber).toHaveAttribute('data-memory-status', 'demo')
    await expect(chamber).toHaveAttribute('data-memory-id', 'demo:voice-note-home')
    await expect(chamber).toHaveAttribute('data-manifest-id', 'demo-manifest')
    const destination = new URL(page.url())
    for (const key of ['memoryId', 'node', 'returnNode']) expect(destination.searchParams.get(key)).toBe('voice-note-home')
    expect(destination.searchParams.get('manifestId')).toBe('demo-manifest')
    expect(destination.searchParams.get('demo')).toBe('1')
    await page.locator('.focusControls .unwind').click()
    await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/life-map')
    await expect(panel).toBeVisible()
    await expect(panel.locator('.life-map-semantic-result[data-life-map-node-id="voice-note-home"]')).toHaveAttribute('aria-current', 'true')
    for (const key of ['memoryId', 'node']) expect(new URL(page.url()).searchParams.get(key)).toBe('voice-note-home')
    expect(new URL(page.url()).searchParams.get('manifestId')).toBe('demo-manifest')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(inspector).toBeVisible()
    await expect(panel.locator('.life-map-semantic-result[data-life-map-node-id="voice-note-home"]')).toHaveAttribute('aria-current', 'true')
    await actions.nth(0).scrollIntoViewIfNeeded()
    await assertPainted(actions.nth(0), `fallback-focus-after-refresh-${viewport.width}x${viewport.height}`)
  })
}

test('no-WebGL private-unavailable direct link cannot expose sample Focus actions without admission', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/life-map?memoryId=private-unavailable-probe&node=private-unavailable-probe', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('urai-life-map-signed-out-threshold')).toHaveAttribute('data-private-memory-mounted', 'false')
  await expect(page.locator('#life-map-navigator')).toHaveCount(0)
  await expect(page.locator('.life-map-semantic-inspector')).toHaveCount(0)
  expect(new URL(page.url()).searchParams.get('demo')).toBeNull()
})
