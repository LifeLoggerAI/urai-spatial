import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 320, height: 700 }, { width: 844, height: 390 }]) {
  test(`Founder helper stays in flow on text surfaces at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const pageErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    for (const route of ['/about', '/support', '/status', '/location-map']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const launcher = page.locator('[data-urai-adam-launcher]')
      await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
      await launcher.scrollIntoViewIfNeeded()
      const geometry = await launcher.evaluate(element => {
        const r = element.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return { width: r.width, height: r.height, left: r.left, right: r.right, viewportWidth: innerWidth, position: getComputedStyle(element).position, pointerReachable: hit === element || element.contains(hit) }
      })
      expect(geometry.position).toBe('static')
      expect(geometry.width).toBeGreaterThanOrEqual(48)
      expect(geometry.height).toBeGreaterThanOrEqual(48)
      expect(geometry.left).toBeGreaterThanOrEqual(0)
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth)
      expect(geometry.pointerReachable).toBe(true)
      await launcher.focus()
      await page.keyboard.press('Enter')
      const about = page.getByText('About Adam', { exact: true })
      await expect(about).toBeVisible()
      expect((await about.boundingBox())!.height).toBeGreaterThanOrEqual(48)
      await about.focus()
      await page.keyboard.press('Enter')
      await expect(about.locator('..')).toHaveAttribute('open', '')
      await page.getByRole('button', { name: 'Close Adam', exact: true }).click()
      await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
      expect(pageErrors, `No hydration or runtime errors on ${route}`).toEqual([])
      await test.info().attach(`founder-${route.slice(1)}-${viewport.width}-geometry.json`, { body: JSON.stringify(geometry), contentType: 'application/json' })
    }
  })
}
