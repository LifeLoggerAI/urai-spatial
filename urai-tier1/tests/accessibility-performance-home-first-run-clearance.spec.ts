import { expect, test } from '@playwright/test'

/**
 * R1316: automated browser acceptance for the first-run Home clearance repair.
 * Local candidate only. This is a layout regression, not cinematic visual approval,
 * proof of authenticated memory services, or authorization to release.
 */
const completionKey = 'urai:onboarding:v2:complete'
const guideSelector = '.uraiV2OnboardingCard[data-home-guide="true"][data-first-run="automatic"]'

test.beforeEach(async ({ page, baseURL }) => {
  if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
    throw new Error('R1316 Home clearance acceptance requires an authorized local candidate.')
  }
  await page.addInitScript(key => localStorage.removeItem(key), completionKey)
})

for (const viewport of [
  { width: 1365, height: 761, maxGuideWidth: 286, layout: 'desktop' },
  { width: 1024, height: 768, maxGuideWidth: 286, layout: 'desktop' },
  { width: 390, height: 844, maxGuideWidth: 300, layout: 'mobile' },
  { width: 320, height: 568, maxGuideWidth: 296, layout: 'mobile' },
]) {
  test(`automatic Home introduction remains compact, usable and inside ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const guide = page.locator(guideSelector)
    await expect(guide).toBeVisible({ timeout: 30_000 })

    // Compute actual painted viewport geometry, not a source-text CSS match.
    const metrics = await guide.evaluate(card => {
      const r = card.getBoundingClientRect()
      const actions = Array.from(card.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('a[href], button'))
        .map(action => {
          const bounds = action.getBoundingClientRect()
          return {
            text: action.textContent?.trim() ?? '',
            x: bounds.left,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height,
            visible: getComputedStyle(action).visibility === 'visible',
          }
        })
      return {
        width: r.width,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        actions,
      }
    })

    await test.info().attach(`home-clearance-${viewport.width}x${viewport.height}.json`, {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    })

    expect(metrics.width, 'automatic guide width').toBeLessThanOrEqual(viewport.maxGuideWidth + 1)
    expect(metrics.left, 'guide inside left viewport edge').toBeGreaterThanOrEqual(0)
    expect(metrics.right, 'guide inside right viewport edge').toBeLessThanOrEqual(viewport.width + 1)
    expect(metrics.top, 'guide inside top viewport edge').toBeGreaterThanOrEqual(0)
    expect(metrics.bottom, 'guide inside bottom viewport edge').toBeLessThanOrEqual(viewport.height + 1)
    expect(metrics.documentWidth, 'no horizontal document overflow').toBeLessThanOrEqual(viewport.width + 1)

    expect(metrics.actions, 'Enter Ground and Skip remain discoverable').toHaveLength(2)
    for (const action of metrics.actions) {
      expect(action.visible, `${action.text} visible`).toBe(true)
      expect(action.width, `${action.text} target width`).toBeGreaterThanOrEqual(48)
      expect(action.height, `${action.text} target height`).toBeGreaterThanOrEqual(48)
      expect(action.x, `${action.text} target left`).toBeGreaterThanOrEqual(-1)
      expect(action.x + action.width, `${action.text} target right`).toBeLessThanOrEqual(viewport.width + 1)
      expect(action.y + action.height, `${action.text} target bottom`).toBeLessThanOrEqual(viewport.height + 1)
    }

    // CSS clearance must not break the previously preserved first-run dismiss flow.
    await guide.getByRole('button', { name: 'Skip', exact: true }).click()
    await expect(guide).toHaveCount(0)
  })
}
