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
    const headingOverlap = await fallback.locator('h1').evaluate(heading => {
      const h = heading.getBoundingClientRect()
      return [...document.querySelectorAll('button,a')].filter(node => {
        const r = node.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden' && r.x < h.right && r.right > h.x && r.y < h.bottom && r.bottom > h.y
      }).map(node => node.outerHTML.slice(0, 220))
    })
    await test.info().attach('home-fallback-heading-overlaps.json', { body: JSON.stringify(headingOverlap), contentType: 'application/json' })
    expect(headingOverlap).toEqual([])
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

test('desktop first-run guide leaves Home movement and dismissal targets reachable', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width:1440, height:900 })
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/?onboarding=1', { waitUntil:'domcontentloaded', timeout: 30_000 })
  const guide = page.locator('.uraiV2OnboardingCard[data-first-run="guided"]')
  const movement = page.getByRole('group', { name:'Home movement controls' })
  await expect(guide).toBeVisible()
  await expect(movement).toBeVisible()
  const geometry = await page.evaluate(() => {
    const card = document.querySelector('.uraiV2OnboardingCard')!.getBoundingClientRect()
    const buttons = [...document.querySelectorAll('[role="group"][aria-label="Home movement controls"] button,.uraiV2OnboardingCard button,.uraiV2OnboardingCard a')].filter(node => node.getBoundingClientRect().width > 0)
    return { guideBottom:card.bottom, movementTop:document.querySelector('[role="group"][aria-label="Home movement controls"]')!.getBoundingClientRect().top, controls:buttons.map(node => {
      const r = node.getBoundingClientRect();const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
      return { label:node.getAttribute('aria-label')||node.textContent, width:r.width,height:r.height,pointerReachable:hit===node||(hit!==null&&node.contains(hit)) }
    }) }
  })
  await test.info().attach('onboarding-movement-clearance.json', { body:JSON.stringify(geometry),contentType:'application/json' })
  await test.info().attach('onboarding-movement.png', { body:await page.screenshot(),contentType:'image/png' })
  expect(geometry.guideBottom+8).toBeLessThanOrEqual(geometry.movementTop)
  expect(geometry.controls).toHaveLength(6)
  for(const control of geometry.controls) {
    expect(control.width).toBeGreaterThanOrEqual(48);expect(control.height).toBeGreaterThanOrEqual(48);expect(control.pointerReachable).toBe(true)
  }
  await guide.getByRole('button',{name:'Skip'}).focus()
  await page.keyboard.press('Enter')
  await expect(guide).toHaveCount(0)
})

test('reduced-motion Home rests between keyboard movement and look interactions', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    window.localStorage.setItem('urai:onboarding:v2:complete', '1')
    const counters = window as typeof window & { homeDrawCalls: number }
    counters.homeDrawCalls = 0
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const draw = prototype.drawElements
      prototype.drawElements = function (...args) { counters.homeDrawCalls += 1; return draw.apply(this, args) }
    }
  })
  await page.goto('/home/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const home = page.locator('[data-home-primary-owner="asset-driven"]')
  await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45_000 })
  const readDraws = () => page.evaluate(() => (window as typeof window & { homeDrawCalls: number }).homeDrawCalls)
  await expect(home).toHaveAttribute('data-home-player-z', /^-?\d/)
  let previous = await readDraws(), stableObservations = 0
  await expect.poll(async () => {
    const current = await readDraws(), difference = current - previous
    previous = current
    stableObservations = difference === 0 ? stableObservations + 1 : 0
    return stableObservations
  }, { intervals: [500, 500, 500], timeout: 15_000 }).toBe(3)

  const startZ = Number(await home.getAttribute('data-home-player-z'))
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
  await page.keyboard.down('KeyW')
  try {
    await expect.poll(async () => startZ - Number(await home.getAttribute('data-home-player-z')), { timeout: 15_000 }).toBeGreaterThan(0.1)
  } finally { await page.keyboard.up('KeyW') }
  const movingDraws = await readDraws()
  expect(movingDraws).toBeGreaterThan(previous)
  previous = movingDraws
  stableObservations = 0
  await expect.poll(async () => {
    const current = await readDraws(), difference = current - previous
    previous = current
    stableObservations = difference === 0 ? stableObservations + 1 : 0
    return stableObservations
  }, { intervals: [500, 500, 500], timeout: 15_000 }).toBe(3)

  const restingDraws = previous
  await page.mouse.move(700, 420)
  await page.mouse.down()
  await page.mouse.move(760, 420, { steps: 4 })
  await page.mouse.up()
  await expect.poll(readDraws, { timeout: 15_000 }).toBeGreaterThan(restingDraws)
})
