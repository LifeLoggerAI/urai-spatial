import { expect, test, type Browser, type Locator } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3000'
const homeOwnerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'

async function waitForHomeWorld(home: Locator) {
  await expect(home).toBeVisible({ timeout: 30_000 })
  await expect(home.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-ready', 'true', { timeout: 45_000 })
}

function rectanglesOverlap(
  first: { left: number; top: number; right: number; bottom: number },
  second: { left: number; top: number; right: number; bottom: number },
) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top
}

async function verifyViewport(
  browser: Browser,
  viewport: { width: number; height: number; label: string },
) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  try {
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })

    const home = page.locator(homeOwnerSelector)
    await waitForHomeWorld(home)

    const movement = page.getByRole('group', { name: 'Home movement controls' })
    const semantic = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    await expect(movement).toBeVisible()
    await expect(semantic).toBeVisible()
    await expect(semantic).toHaveAttribute('data-home-navigation-owner', 'runtime-boundary')
    await expect(semantic).toHaveAttribute('data-home-navigation-non-dominant', 'true')

    // Capture layout, touch-target bounds, and focus behavior in one browser
    // round-trip. The full production Home is intentionally exercised here;
    // repeated locator/boundingBox protocol calls can starve behind the
    // software-rendered WebGL main thread in CI without changing the product
    // state being asserted.
    const layout = await page.evaluate(async () => {
      const movementNode = document.querySelector<HTMLElement>('.urai-mobile-movement')
      const semanticNode = document.querySelector<HTMLElement>('.urai-home-spatial-runtime-layer > .home-semantic-navigation')
      const viewport = window.visualViewport
      const destinations = [
        semanticNode?.querySelector<HTMLElement>('[data-testid="home-semantic-orb"]'),
        semanticNode?.querySelector<HTMLElement>('[data-testid="home-semantic-ground"]'),
        semanticNode?.querySelector<HTMLElement>('[data-testid="home-semantic-life-map"]'),
      ]
      if (!movementNode || !semanticNode || destinations.some((destination) => !destination)) return null

      const rect = (element: HTMLElement) => {
        const bounds = element.getBoundingClientRect()
        return {
          left: bounds.left,
          top: bounds.top,
          right: bounds.right,
          bottom: bounds.bottom,
          width: bounds.width,
          height: bounds.height,
        }
      }

      const semanticOpacity = Number.parseFloat(getComputedStyle(semanticNode).opacity || '1')
      destinations[0]!.focus()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      return {
        movement: rect(movementNode),
        semantic: rect(semanticNode),
        semanticOpacity,
        viewport: { width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        destinationCount: semanticNode.querySelectorAll(':is(button,a)').length,
        destinations: destinations.map((destination) => rect(destination!)),
        focusedDestination: document.activeElement?.getAttribute('data-testid') ?? null,
        focusedOpacity: Number.parseFloat(getComputedStyle(semanticNode).opacity || '1'),
      }
    })

    expect(layout, `${viewport.label} layout`).not.toBeNull()
    expect(rectanglesOverlap(layout!.movement, layout!.semantic), `${viewport.label} controls overlap`).toBe(false)
    for (const rect of [layout!.movement, layout!.semantic]) {
      expect(rect.left, `${viewport.label} left containment`).toBeGreaterThanOrEqual(0)
      expect(rect.top, `${viewport.label} top containment`).toBeGreaterThanOrEqual(0)
      expect(rect.right, `${viewport.label} right containment`).toBeLessThanOrEqual(layout!.viewport.width + 1)
      expect(rect.bottom, `${viewport.label} bottom containment`).toBeLessThanOrEqual(layout!.viewport.height + 1)
    }
    expect(layout!.semanticOpacity, `${viewport.label} non-dominant opacity`).toBeLessThanOrEqual(0.02)
    expect(layout!.documentWidth, `${viewport.label} document width`).toBeLessThanOrEqual(layout!.viewport.width + 1)
    expect(layout!.destinationCount, `${viewport.label} destination count`).toBe(3)
    for (const rect of layout!.destinations) {
      expect(rect.width, `${viewport.label} destination width`).toBeGreaterThanOrEqual(48)
      expect(rect.height, `${viewport.label} destination height`).toBeGreaterThanOrEqual(48)
    }
    expect(layout!.focusedDestination, `${viewport.label} focused destination`).toBe('home-semantic-orb')
    expect(layout!.focusedOpacity, `${viewport.label} focus reveal`).toBeGreaterThan(0.9)
  } finally {
    await context.close()
  }
}

test.describe('Home mobile control separation evidence', () => {
  test.describe.configure({ timeout: 180_000 })

  for (const viewport of [
    { width: 390, height: 844, label: 'portrait' },
    { width: 844, height: 390, label: 'landscape' },
  ]) {
    test(`${viewport.label} movement and semantic destinations remain independently operable inside safe areas`, async ({ browser }) => {
      await verifyViewport(browser, viewport)
    })
  }
})
