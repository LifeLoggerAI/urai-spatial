import { expect, test } from '@playwright/test'

const profiles = [
  { name: '320-touch', width: 320, height: 700, motion: 'no-preference' as const, touch: true },
  { name: '320-keyboard-reduced', width: 320, height: 700, motion: 'reduce' as const, touch: false },
  { name: 'portrait', width: 390, height: 844, motion: 'no-preference' as const, touch: true },
  { name: 'desktop', width: 1440, height: 900, motion: 'reduce' as const, touch: false },
]

for (const route of ['life-map', 'focus']) for (const profile of profiles) {
  test(`Founder panel fits and restores ${route} at ${profile.name}`, async ({ browser, baseURL }) => {
    test.setTimeout(90_000)
    const context = await browser.newContext({ baseURL, viewport: { width: profile.width, height: profile.height }, reducedMotion: profile.motion, hasTouch: profile.touch })
    const page = await context.newPage()
    try {
      await page.goto(`/${route}/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset`)
      const root = page.locator(route === 'life-map' ? '[data-testid="urai-true-3d-life-map"]' : '[data-testid="urai-final-focus-chamber"]')
      await expect(root).toHaveAttribute(route === 'life-map' ? 'data-life-map-render-ready' : 'data-focus-render-ready', 'true', { timeout: 60_000 })
      const launcher = page.locator('[data-urai-adam-launcher]')
      await expect(launcher).toHaveAccessibleName(/Talk with Adam/)
      if (profile.touch) await launcher.tap()
      else {
        for (let tabs = 0; tabs < 50 && !await launcher.evaluate(el => document.activeElement === el); tabs++) await page.keyboard.press('Tab')
        await expect(launcher).toBeFocused()
        await page.keyboard.press('Enter')
      }
      const panel = page.locator('[data-urai-adam-presence]')
      const close = panel.getByRole('button', { name: 'Close Adam', exact: true })
      await expect(close).toBeFocused()
      const geometry = await panel.evaluate(owner => {
        const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
        const bounds = rect(owner)
        return { panel: bounds, scrollTop: owner.scrollTop, status: rect(owner.querySelector('[role="status"]')!), controls: [...owner.querySelectorAll('button,textarea,form label')].map(el => {
          const box = rect(el)
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
          return { ...box, text: el.textContent, reachable: hit === el || Boolean(hit && el.contains(hit)) }
        }) }
      })
      await test.info().attach(`${route}-${profile.name}-geometry.json`, { body: JSON.stringify(geometry), contentType: 'application/json' })
      await test.info().attach(`${route}-${profile.name}-open.png`, { body: await page.screenshot({ animations: 'allow' }), contentType: 'image/png' })
      expect(geometry.scrollTop).toBe(0)
      expect(geometry.panel.x).toBeGreaterThanOrEqual(0)
      expect(geometry.panel.y).toBeGreaterThanOrEqual(0)
      expect(geometry.panel.right).toBeLessThanOrEqual(profile.width)
      expect(geometry.panel.bottom).toBeLessThanOrEqual(profile.height)
      expect(geometry.status.bottom).toBeLessThanOrEqual(geometry.panel.bottom - 1)
      expect(geometry.status.y).toBeGreaterThanOrEqual(geometry.panel.y)
      for (const control of geometry.controls) {
        expect(control.x).toBeGreaterThanOrEqual(geometry.panel.x)
        expect(control.right).toBeLessThanOrEqual(geometry.panel.right)
        expect(control.bottom).toBeLessThanOrEqual(geometry.panel.bottom)
        expect(control.width).toBeGreaterThanOrEqual(48)
        expect(control.height).toBeGreaterThanOrEqual(48)
        expect(control.reachable).toBe(true)
      }
      await panel.locator('details summary').click()
      await panel.getByRole('textbox', { name: 'Message Adam' }).fill('Local layout verification; no provider request.')
      const box = await panel.boundingBox()
      expect(box).not.toBeNull()
      await page.mouse.move(box!.x + box!.width / 2, box!.y + 20)
      await page.mouse.wheel(0, 1000)
      await expect.poll(() => panel.getByRole('status').evaluate(el => {
        const r = el.getBoundingClientRect(), p = el.closest('[data-urai-adam-presence]')!.getBoundingClientRect()
        return r.y >= p.y && r.bottom <= p.bottom
      })).toBe(true)
      const scroll = await panel.evaluate(el => ({ scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }))
      if (scroll.scrollHeight > scroll.clientHeight) expect(scroll.scrollTop).toBeGreaterThan(0)
      await test.info().attach(`${route}-${profile.name}-scroll.json`, { body: JSON.stringify(scroll), contentType: 'application/json' })
      await test.info().attach(`${route}-${profile.name}-expanded-scrolled.png`, { body: await page.screenshot({ animations: 'allow' }), contentType: 'image/png' })
      if (profile.touch) await close.tap()
      else await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await expect(launcher).toBeFocused()
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(profile.motion === 'reduce')
    } finally { await context.close() }
  })
}
