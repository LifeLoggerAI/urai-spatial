import { expect, test } from '@playwright/test'

const origin = process.env.URAI_PROOF_BASE_URL || 'http://127.0.0.1:4290'
const routes = ['/privacy', '/privacy-policy', '/terms', '/account-deletion', '/launch', '/sms-opt-in', '/status', '/system', '/waitlist', '/settings/communications', '/memory', '/proof', '/receipts', '/technology', '/tier4', '/tier5', '/spatial/biome']

for (const viewport of [{ width: 320, height: 700 }, { width: 1440, height: 900 }]) {
  test.describe(`Supporting documents ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })
    for (const route of routes) {
      test(`${route} supports wheel, keyboard, and the last action`, async ({ page }, info) => {
        const errors: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        await page.goto(new URL(route, origin).href, { waitUntil: 'domcontentloaded' })
        const owner = page.locator('[data-document-scroll-owner="true"]:visible')
        await expect(owner).toHaveCount(1)
        await expect(owner.locator('h1')).toBeVisible()
        const dimensions = await owner.evaluate(element => ({ height: element.clientHeight, contentHeight: element.scrollHeight, width: element.clientWidth, contentWidth: element.scrollWidth, overflowY: getComputedStyle(element).overflowY }))
        expect(dimensions.overflowY).toBe('auto')
        expect(dimensions.height).toBeLessThanOrEqual(viewport.height)
        expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width + 1)
        await info.attach('document-start.png', { body: await page.screenshot(), contentType: 'image/png' })

        if (dimensions.contentHeight > dimensions.height + 2) {
          await page.mouse.move(viewport.width / 2, viewport.height / 2)
          await page.mouse.wheel(0, 550)
          await expect.poll(() => owner.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
          // Wheel delivery is asynchronous; finish its paint before the separate keyboard action.
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
        }
        await owner.focus()
        await page.keyboard.press('End')
        await expect.poll(() => owner.evaluate(element => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThanOrEqual(2)
        await expect(owner.locator('p:visible').last()).toBeInViewport({ ratio: 1 })
        const lastAction = owner.locator('a:visible,button:visible,input:visible,select:visible,summary:visible').last()
        await expect(lastAction).toBeInViewport({ ratio: 1 })
        await lastAction.focus()
        await expect(lastAction).toBeFocused()
        const reachable = await lastAction.evaluate(element => {
          const rect = element.getBoundingClientRect()
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return hit === element || element.contains(hit)
        })
        expect(reachable).toBe(true)
        expect(errors).toEqual([])
        await info.attach('scroll-evidence.json', { body: JSON.stringify({ route, finalUrl: page.url(), viewport, dimensions, reachable, errors }), contentType: 'application/json' })
        await info.attach('document-end.png', { body: await page.screenshot(), contentType: 'image/png' })
      })
    }

    test('Capture Focus preserves selection and explicit demo context', async ({ page }) => {
      const context = '?demo=1&memoryId=demo%3Aquiet-reset&node=quiet-reset&from=capture#selected'
      await page.goto(`${origin}/capture/focus${context}`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(new RegExp('/focus/?.*memoryId=demo%3Aquiet-reset'))
      const final = new URL(page.url())
      expect(final.searchParams.get('demo')).toBe('1')
      expect(final.searchParams.get('node')).toBe('quiet-reset')
      expect(final.searchParams.get('from')).toBe('capture')
      expect(final.hash).toBe('#selected')
      await page.goto(`${origin}/capture/focus?memoryId=private-unavailable`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/focus\/?\?memoryId=private-unavailable/)
      expect(new URL(page.url()).searchParams.has('demo')).toBe(false)
    })

    test('Settings keeps one accessible Language label', async ({ page }) => {
      await page.goto(`${origin}/settings`, { waitUntil: 'domcontentloaded' })
      const language = page.getByTestId('language-settings')
      await expect(language.getByRole('heading', { name: 'Language', exact: true })).toHaveCount(1)
      await expect(language.getByRole('combobox', { name: 'Language', exact: true })).toBeEnabled()
      await expect(language.locator('label')).toHaveCount(0)
    })
  })
}
