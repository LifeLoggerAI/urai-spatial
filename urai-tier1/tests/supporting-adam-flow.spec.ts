import { expect, test } from '@playwright/test'

const origin = process.env.URAI_PROOF_BASE_URL || 'http://127.0.0.1:4290'
const surfaces = [
  { route: '/control', slot: 'missing-route-actions' },
  { route: '/internal/locks', slot: 'internal-locks-actions' },
  { route: '/spatial/biome', slot: 'emotional-biome-actions' },
]

for (const viewport of [{ width: 320, height: 700 }, { width: 1440, height: 900 }]) {
  test.describe(`Supporting Adam flow ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })
    for (const { route, slot } of surfaces) {
      test(`${route} keeps Adam beside page actions without covering content`, async ({ page }, info) => {
        const errors: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        await page.goto(new URL(route, origin).href, { waitUntil: 'domcontentloaded' })
        const launcher = page.getByRole('button', { name: /^Talk with Adam in / })
        const anchor = page.locator(`[data-urai-adam-launcher-slot="${slot}"]`)
        await expect(launcher).toHaveCount(1)
        await expect(anchor.locator('button')).toHaveCount(1)
        if (route === '/control') {
          await page.keyboard.press('Tab')
          await expect(page.getByRole('link', { name: 'Return home', exact: true })).toBeFocused()
        }
        await launcher.scrollIntoViewIfNeeded()
        await expect(launcher).toBeInViewport({ ratio: 1 })
        const geometry = await launcher.evaluate(element => {
          const r = element.getBoundingClientRect()
          const overlaps = [...document.querySelectorAll('main h1, main h2, main p, main label, main a')].filter(target => {
            const t = target.getBoundingClientRect()
            return t.width > 0 && t.height > 0 && r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top
          }).map(target => target.textContent?.trim())
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return { overlaps, hit: hit === element || element.contains(hit), width: document.documentElement.scrollWidth, viewportWidth: innerWidth, position: getComputedStyle(element).position }
        })
        expect(geometry.overlaps).toEqual([])
        expect(geometry.hit).toBe(true)
        expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth)
        expect(geometry.position).not.toBe('fixed')
        await launcher.focus()
        await expect(launcher).toBeFocused()
        expect(errors).toEqual([])
        await info.attach('adam-flow-evidence.json', { body: JSON.stringify({ route, viewport, slot, geometry, errors }), contentType: 'application/json' })
        await info.attach('adam-flow.png', { body: await page.screenshot(), contentType: 'image/png' })
      })
    }
  })
}
