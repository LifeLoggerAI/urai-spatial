import { expect, test } from '@playwright/test'

const route = '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

for (const width of [320, 390, 768, 1024, 1200, 1440]) {
  for (const noWebGL of [false, true]) {
    test(`Focus disclosure, labels and helper remain clear at ${width}px, noWebGL=${noWebGL}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 700 : width === 390 ? 844 : width < 1200 ? 1024 : 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      if (noWebGL) await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
          return original.apply(this, [type, ...args] as Parameters<typeof original>)
        } as typeof HTMLCanvasElement.prototype.getContext
      })
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const focus = page.locator('[data-testid="urai-final-focus-chamber"]:visible')
      await expect(focus).toHaveCount(1)
      const helper = page.locator('[data-urai-adam-launcher]')
      await expect(helper).toBeVisible()
      const geometry = await focus.evaluate(owner => {
        const rect = (element: Element) => {
          const r = element.getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, selector: element.className || element.tagName }
        }
        const launcher = document.querySelector('[data-urai-adam-launcher]')!
        const heading = owner.querySelector('.focusHeading')!
        const headingRange = document.createRange()
        headingRange.selectNodeContents(heading)
        const status = owner.querySelector('.focusStatus')!
        const statusBox = rect(status)
        const statusStyle = getComputedStyle(status)
        return {
          helper: rect(launcher),
          controlRail: rect(owner.querySelector('.focusControls')!),
          headingText: [...headingRange.getClientRects()].map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, selector: 'heading text' })),
          status: {
            box: statusBox,
            visuallyHidden: statusBox.width <= 1 && statusBox.height <= 1 && statusStyle.clipPath !== 'none',
          },
          protected: [...owner.querySelectorAll('.focusHeading,.memoryMeaning,.focusControls,.focusHelp,.focusFallback strong,.focusFallback span')].map(rect),
          controls: [...owner.querySelectorAll('.focusControls button,.focus-spatial-aperture-button')].filter(button => {
            const r = button.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && getComputedStyle(button).visibility !== 'hidden'
          }).map(button => {
            const range = document.createRange()
            range.selectNodeContents(button)
            const box = rect(button)
            const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
            return { box, pointerReachable: hit === button || (hit !== null && button.contains(hit)), text: [...range.getClientRects()].map(r => ({ x: r.x, right: r.right, y: r.y, bottom: r.bottom, selector: button.className || button.tagName })) }
          }),
        }
      })
      await test.info().attach('mobile-focus-geometry.json', { body: JSON.stringify(geometry), contentType: 'application/json' })
      const overlaps = (a: typeof geometry.helper, b: typeof geometry.helper) =>
        a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
      expect(geometry.helper.width).toBeGreaterThanOrEqual(48)
      expect(geometry.helper.height).toBeGreaterThanOrEqual(48)
      for (const box of geometry.protected) expect(overlaps(geometry.helper, box)).toBe(false)
      for (const box of geometry.headingText) expect(overlaps(geometry.controlRail, box)).toBe(false)
      if (!geometry.status.visuallyHidden) {
        expect(overlaps(geometry.status.box, geometry.controlRail)).toBe(false)
        for (const box of geometry.headingText) expect(overlaps(geometry.status.box, box)).toBe(false)
      }
      await expect(focus.locator('.focusStatus')).toHaveAttribute('aria-live', 'polite')
      await expect(focus.locator('.focusStatus')).toContainText('Stellar memory field ready')
      expect(geometry.controls.length).toBeGreaterThanOrEqual(3)
      for (const { box, text, pointerReachable } of geometry.controls) {
        expect(pointerReachable).toBe(true)
        expect(box.width).toBeGreaterThanOrEqual(48)
        expect(box.height).toBeGreaterThanOrEqual(48)
        for (const line of text) {
          expect(line.x).toBeGreaterThanOrEqual(box.x)
          expect(line.right).toBeLessThanOrEqual(box.right)
          expect(line.y).toBeGreaterThanOrEqual(box.y)
          expect(line.bottom).toBeLessThanOrEqual(box.bottom)
        }
      }
      await test.info().attach(`focus-layout-${width}-no-webgl-${noWebGL}.png`, {
        body: await page.screenshot(), contentType: 'image/png',
      })
      await helper.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('button', { name: 'Close Adam', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Close Adam', exact: true }).click()
      await focus.locator('.focusControls').getByRole('button', { name: /Open Replay for/ }).click()
      await expect.poll(() => new URL(page.url()).pathname.replace(/\/$/, '')).toBe('/replay')
      expect(new URL(page.url()).searchParams.get('memoryId')).toBe('demo:quiet-reset')
    })
  }
}
