import { expect, test } from '@playwright/test'

for (const width of [320, 390]) {
  for (const route of ['/demo', '/demo/replay-film']) {
    test(`Demo keeps Adam beside its actions at ${width}px on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 700 : 844 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const main = page.locator('[data-launch-surface="cinematic-replay-film-proof"]')
      await expect(main).toHaveAttribute('data-demo-disclosure', 'not-personal-data')
      await expect(main.locator('.demoFilmDisclosure')).toContainText('Demo fixture · not personal data')
      const launcher = main.locator('[data-urai-adam-launcher-slot="demo-film"] [data-urai-adam-launcher]')
      await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
      await launcher.scrollIntoViewIfNeeded()
      const geometry = await launcher.evaluate(element => {
        const box = element.getBoundingClientRect()
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        const overlaps = [...document.querySelectorAll('.demoFilmHero h1, .demoFilmHero p, .demoFilmActions > a')].filter(node => {
          const other = node.getBoundingClientRect()
          return box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
        }).map(node => node.textContent?.trim())
        return { position: getComputedStyle(element).position, width: box.width, height: box.height, insideViewport: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, reachable: hit === element || element.contains(hit), overlaps }
      })
      expect(geometry.position).toBe('static')
      expect(geometry.width).toBeGreaterThanOrEqual(48)
      expect(geometry.height).toBeGreaterThanOrEqual(48)
      expect(geometry.insideViewport).toBe(true)
      expect(geometry.reachable).toBe(true)
      expect(geometry.overlaps).toEqual([])
      await launcher.focus()
      await page.keyboard.press('Enter')
      const panel = page.getByRole('complementary', { name: 'Adam founder presence' })
      await expect(panel).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await expect(launcher).toBeFocused()
      await expect(main.getByRole('link', { name: 'Enter Home', exact: true })).toHaveAttribute('href', /^\/home\/?$/)
      await main.getByRole('link', { name: 'Play the proof rail', exact: true }).click()
      await expect(main.locator('#film')).toBeInViewport()
      expect(errors).toEqual([])
      await test.info().attach(`demo-adam-${width}-geometry.json`, { body: JSON.stringify(geometry), contentType: 'application/json' })
    })
  }
}
