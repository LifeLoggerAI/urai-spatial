import { test, expect, type Locator } from '@playwright/test'

test.use({ hasTouch: true })
const completionKey = 'urai:onboarding:v2:complete'

async function paintedTargets(guide: Locator) {
  return guide.locator('a[href],button').evaluateAll(elements => elements.map(element => {
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
  }))
}

async function assertPainted(guide: Locator, receiptName: string) {
  const results = await paintedTargets(guide)
  await test.info().attach(`${receiptName}.json`, { body: JSON.stringify(results, null, 2), contentType: 'application/json' })
  expect(results).toHaveLength(2)
  for (const result of results) {
    expect(result.width).toBeGreaterThanOrEqual(48)
    expect(result.height).toBeGreaterThanOrEqual(48)
    expect(result.labelPainted, `${result.label} text must be inside every clipping ancestor`).toBe(true)
    expect(result.targetPainted, `${result.label} touch target must be inside every clipping ancestor`).toBe(true)
    expect(result.hitOwned, `${result.label} must not be covered by another layer`).toBe(true)
  }
}

test.beforeEach(async ({ page, baseURL }) => {
  if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) throw new Error('Onboarding acceptance is restricted to the authorized local candidate.')
  await page.addInitScript(key => localStorage.removeItem(key), completionKey)
})

for (const viewport of [{ width: 568, height: 320 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  for (const activation of ['touch', 'keyboard'] as const) {
    test(`initial guided actions are fully painted and dismiss with ${activation} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize(viewport)
      await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
      const guide = page.locator('.uraiV2OnboardingCard[data-first-run="guided"]')
      await expect(guide).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      // Measure before focusing, clicking or scrolling can conceal initial clipping.
      await assertPainted(guide, `initial-painted-${viewport.width}x${viewport.height}-${activation}`)
      await test.info().attach(`initial-original-${viewport.width}x${viewport.height}-${activation}.png`, { body: await page.screenshot(), contentType: 'image/png' })
      const skip = guide.getByRole('button', { name: 'Skip', exact: true })
      if (activation === 'touch') await skip.tap()
      else { await skip.focus(); await expect(skip).toBeFocused(); await page.keyboard.press('Enter') }
      await expect(guide).toHaveCount(0)
      expect(await page.evaluate(key => localStorage.getItem(key), completionKey)).toBe('1')
    })
  }
}

test('long guide copy can scroll while both action labels remain painted', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 568, height: 320 })
  await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
  const guide = page.locator('.uraiV2OnboardingCard[data-first-run="guided"]')
  await expect(guide).toBeVisible()
  // Explicit content stress, not evidence of translation or native language review.
  await guide.locator('strong').evaluate(element => { element.textContent = `${element.textContent} `.repeat(12) })
  await assertPainted(guide, 'long-copy-initial-painted')
  const content = guide.locator('.uraiV2OnboardingContent')
  const scroll = await content.evaluate(element => {
    const target = element as HTMLElement
    const before = target.scrollTop
    target.scrollTop = target.scrollHeight
    return { before, after: target.scrollTop, height: target.clientHeight, total: target.scrollHeight }
  })
  expect(scroll.height).toBeGreaterThan(0)
  expect(scroll.after).toBeGreaterThan(scroll.before)
  await assertPainted(guide, 'long-copy-scrolled-painted')
  await test.info().attach('long-copy-stress-original.png', { body: await page.screenshot(), contentType: 'image/png' })
})

test('a nondefault selected sample survives semantic selection and guide arrival into Focus', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/life-map?demo=1&onboarding=1&overview=1', { waitUntil: 'domcontentloaded' })
  const guide = page.locator('.uraiV2OnboardingCard[data-first-run="guided"]')
  await expect(guide.getByRole('button', { name: 'Select a Memory Star before opening Focus' })).toBeDisabled()
  const semanticTrigger = page.getByTestId('life-map-semantic-trigger')
  if (await semanticTrigger.getAttribute('aria-expanded') === 'false') await semanticTrigger.click()
  await expect(semanticTrigger).toHaveAttribute('aria-expanded', 'true')
  await page.locator('.life-map-semantic-result[data-life-map-node-id="voice-note-home"]').click()
  const focus = guide.getByRole('link', { name: 'Open Focus', exact: true })
  await expect(focus).toBeVisible()
  const destination = new URL(await focus.getAttribute('href') ?? '', page.url())
  expect(destination.searchParams.get('memoryId')).toBe('voice-note-home')
  expect(destination.searchParams.get('manifestId')).toBe('demo-manifest')
  expect(destination.searchParams.get('demo')).toBe('1')
  expect(destination.searchParams.get('onboarding')).toBe('1')
  expect(await page.evaluate(key => localStorage.getItem(key), completionKey)).toBeNull()
  await focus.tap()
  const chamber = page.getByTestId('urai-final-focus-chamber')
  await expect(chamber).toHaveAttribute('data-memory-status', 'demo')
  await expect(chamber).toHaveAttribute('data-memory-id', 'demo:voice-note-home')
  await expect(chamber).toHaveAttribute('data-manifest-id', 'demo-manifest')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), completionKey)).toBe('1')
  await test.info().attach('guided-nondefault-focus-original.png', { body: await page.screenshot(), contentType: 'image/png' })
})

test('an unavailable private selection has no sample substitution or optimistic completion', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/life-map?memoryId=onboarding-unavailable-probe&onboarding=1', { waitUntil: 'domcontentloaded' })
  const guide = page.locator('.uraiV2OnboardingCard[data-first-run="guided"]')
  await expect(guide.getByRole('button', { name: 'Select a Memory Star before opening Focus' })).toBeDisabled()
  await expect(guide.getByRole('link', { name: 'Open Focus', exact: true })).toHaveCount(0)
  expect(await page.evaluate(key => localStorage.getItem(key), completionKey)).toBeNull()
  await page.goto('/focus?memoryId=onboarding-unavailable-probe&onboarding=1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('urai-final-focus-chamber')).not.toHaveAttribute('data-memory-status', /^(ready|demo)$/)
  expect(await page.evaluate(key => localStorage.getItem(key), completionKey)).toBeNull()
})
