import { expect, test } from '@playwright/test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 1440, height: 1100 }, { width: 320, height: 390 }]) {
    test(`Founder status remains readable at ${viewport.width}x${viewport.height} with ${reducedMotion} motion`, async ({ browser }, info) => {
      const mobile = viewport.width < 560
      const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, reducedMotion })
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      const baseURL = String(info.project.use.baseURL)
      await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort('blockedbyclient'))
      try {
        await page.goto(`${baseURL}/life-map/?demo=1`, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        const launcher = page.locator('[data-urai-adam-launcher]')
        if (mobile) await launcher.tap()
        else { await launcher.focus(); await page.keyboard.press('Enter') }
        const panel = page.getByRole('complementary', { name: 'Adam founder presence' })
        const status = panel.getByRole('status')
        const close = panel.getByRole('button', { name: 'Close Adam', exact: true })
        await expect(close).toBeFocused()
        await expect(status).toHaveText('Adam is ready when you are.')
        await expect(status).toHaveAttribute('aria-live', 'polite')
        const geometry = () => status.evaluate(element => {
          const panel = element.closest('[data-urai-adam-presence]')!, log = panel.querySelector('[role=log]')!
          const p = panel.getBoundingClientRect(), s = element.getBoundingClientRect(), l = log.getBoundingClientRect()
          return { statusText: element.textContent, status: { top: s.top, bottom: s.bottom, height: s.height }, panel: { top: p.top, bottom: p.bottom, scrollTop: panel.scrollTop, clientHeight: panel.clientHeight, scrollHeight: panel.scrollHeight, overflowY: getComputedStyle(panel).overflowY }, log: { height: l.height, overflowY: getComputedStyle(log).overflowY, scrollHeight: log.scrollHeight, clientHeight: log.clientHeight }, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, sourceSha: document.body.dataset.deployedSha }
        })
        const initial = await geometry()
        expect(initial.horizontalOverflow).toBe(false)
        if (viewport.height >= 700) {
          expect(initial.panel.scrollTop).toBe(0)
          expect(initial.status.top).toBeGreaterThanOrEqual(initial.panel.top)
          expect(initial.status.bottom, 'The complete status line must fit on initial open').toBeLessThanOrEqual(initial.panel.bottom - 1)
        }
        await info.attach('initial-status.json', { body: JSON.stringify(initial), contentType: 'application/json' })
        const initialImage = info.outputPath('initial-status.png')
        await page.screenshot({ path: initialImage })
        await info.attach('initial-status.png', { path: initialImage, contentType: 'image/png' })
        await page.keyboard.press('Tab')
        await expect(panel.locator('summary')).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(panel.locator('details')).toHaveAttribute('open', '')
        const log = panel.getByRole('log')
        await page.keyboard.press('Tab')
        // Chromium exposes an overflowing log as a keyboard scroll stop.
        if (await log.evaluate(element => element === document.activeElement)) {
          expect(await log.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0)
          await page.keyboard.press('End')
          await expect.poll(() => log.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
          await page.keyboard.press('Tab')
        }
        await expect(panel.getByRole('textbox', { name: 'Message Adam', exact: true })).toBeFocused()
        // The real empty-conversation message stays in a nonzero scroll viewport.
        await expect(log).toContainText('Ask me about UrAi, where you are, or what to do next.')
        const expanded = await geometry()
        expect(expanded.log.height).toBeGreaterThanOrEqual(96)
        expect(expanded.log.overflowY).toMatch(/^(auto|scroll)$/)
        expect(expanded.panel.overflowY).toMatch(/^(auto|scroll)$/)
        await log.evaluate(element => { element.scrollTop = element.scrollHeight })
        const lastMessage = log.locator('div').last()
        await lastMessage.scrollIntoViewIfNeeded()
        await expect(lastMessage).toBeInViewport()
        await status.scrollIntoViewIfNeeded()
        // Reach the true scroll end instead of relying on fractional nearest-edge rounding.
        await panel.evaluate(element => { element.scrollTop = element.scrollHeight })
        const scrolled = await geometry()
        expect(scrolled.status.bottom).toBeLessThanOrEqual(scrolled.panel.bottom - 1)
        expect(scrolled.status.top).toBeGreaterThanOrEqual(scrolled.panel.top)
        expect(scrolled.horizontalOverflow).toBe(false)
        await info.attach('expanded-scrolled-status.json', { body: JSON.stringify(scrolled), contentType: 'application/json' })
        const scrolledImage = info.outputPath('expanded-scrolled-status.png')
        await page.screenshot({ path: scrolledImage })
        await info.attach('expanded-scrolled-status.png', { path: scrolledImage, contentType: 'image/png' })
        await expect(close).toBeInViewport({ ratio: 1 })
        const reachable = await close.evaluate(element => { const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === element || element.contains(hit) })
        expect(reachable).toBe(true)
        if (mobile) await close.tap()
        else { await close.focus(); await page.keyboard.press('Enter') }
        await expect(panel).toHaveCount(0)
        await expect(launcher).toBeFocused()
        expect(errors).toEqual([])
      } finally { await context.close() }
    })
  }
}
