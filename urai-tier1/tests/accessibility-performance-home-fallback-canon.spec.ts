import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 700 }]) {
  test(`Home no-WebGL fallback preserves navigation without concept collage at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
        return original.apply(this, [type, ...args] as Parameters<typeof original>)
      } as typeof HTMLCanvasElement.prototype.getContext
    })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const fallback = page.locator('[data-testid="urai-home-accessible-fallback"][data-webgl-state="unavailable"]')
    await expect(fallback).toHaveCount(1)
    await expect(fallback.getByRole('status')).toContainText('WebGL is unavailable')
    const art = await fallback.locator('.urai-genesis-home__world').evaluate(world => ({
      backgrounds: [getComputedStyle(world).backgroundImage, getComputedStyle(world, '::before').backgroundImage, getComputedStyle(world, '::after').backgroundImage],
      avatarVisible: [...world.querySelectorAll('.urai-genesis-home__body')].some(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }),
    }))
    expect(art.backgrounds.join(' ')).not.toMatch(/home-threshold|https?:|url\(/)
    expect(art.avatarVisible).toBe(false)
    const readable = await fallback.evaluate(owner => {
      const rect = (element: Element) => {
        const r = element.getBoundingClientRect()
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
      }
      return {
        status: rect(owner.querySelector('[role="status"]')!),
        heading: rect(owner.querySelector('h1')!),
        targets: [...owner.querySelectorAll('button,a')].filter(el => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
        }).map(rect),
      }
    })
    expect(readable.status.bottom + 12).toBeLessThanOrEqual(readable.heading.y)
    for (const target of readable.targets) {
      expect(target.width).toBeGreaterThanOrEqual(48)
      expect(target.height).toBeGreaterThanOrEqual(48)
    }
    await test.info().attach('home-fallback-readable-geometry.json', { body: JSON.stringify(readable), contentType: 'application/json' })
    const nav = fallback.getByRole('navigation', { name: 'Accessible Home destinations' })
    const controls = await nav.locator(':scope > :is(button,a)').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect()
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return { width: r.width, height: r.height, pointerReachable: hit === node || (hit !== null && node.contains(hit)) }
    }))
    expect(controls).toHaveLength(3)
    for (const control of controls) {
      expect(control.width).toBeGreaterThanOrEqual(48)
      expect(control.height).toBeGreaterThanOrEqual(48)
      expect(control.pointerReachable).toBe(true)
    }
    await test.info().attach('home-fallback-canon.json', { body: JSON.stringify({ viewport, art, controls }), contentType: 'application/json' })
    await test.info().attach('home-fallback.png', { body: await page.screenshot(), contentType: 'image/png' })
    await nav.getByTestId('home-semantic-life-map').focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => new URL(page.url()).pathname.replace(/\/$/, '')).toBe('/life-map')
  })
}
