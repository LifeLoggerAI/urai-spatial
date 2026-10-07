import { expect, test } from '@playwright/test'

const route = '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

for (const width of [320, 390]) {
  for (const noWebGL of [false, true]) {
    test(`Focus mobile labels and helper remain clear at ${width}px, noWebGL=${noWebGL}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 700 : 844 })
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
          return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
        }
        const launcher = document.querySelector('[data-urai-adam-launcher]')!
        return {
          helper: rect(launcher),
          protected: [...owner.querySelectorAll('.focusHeading,.memoryMeaning,.focusControls,.focusHelp,.focusFallback strong,.focusFallback span')].map(rect),
          controls: [...owner.querySelectorAll('.focusControls button,.focus-spatial-aperture-button')].filter(button => {
            const r = button.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && getComputedStyle(button).visibility !== 'hidden'
          }).map(button => {
            const range = document.createRange()
            range.selectNodeContents(button)
            const box = rect(button)
            const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
            return { box, pointerReachable: hit === button || (hit !== null && button.contains(hit)), text: [...range.getClientRects()].map(r => ({ x: r.x, right: r.right, y: r.y, bottom: r.bottom })) }
          }),
        }
      })
      const overlaps = (a: typeof geometry.helper, b: typeof geometry.helper) =>
        a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
      expect(geometry.helper.width).toBeGreaterThanOrEqual(48)
      expect(geometry.helper.height).toBeGreaterThanOrEqual(48)
      for (const box of geometry.protected) expect(overlaps(geometry.helper, box)).toBe(false)
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
      await helper.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('button', { name: 'Close Adam', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Close Adam', exact: true }).click()
      await focus.locator('.focusControls').getByRole('button', { name: /Open Replay for/ }).click()
      await expect.poll(() => new URL(page.url()).pathname.replace(/\/$/, '')).toBe('/replay')
      expect(new URL(page.url()).searchParams.get('memoryId')).toBe('demo:quiet-reset')
      await test.info().attach('mobile-focus-geometry.json', { body: JSON.stringify(geometry), contentType: 'application/json' })
    })
  }
}
