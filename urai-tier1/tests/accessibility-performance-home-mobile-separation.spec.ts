import { expect, test, type Locator } from '@playwright/test'

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

test.describe('Home mobile control separation evidence', () => {
  test.describe.configure({ timeout: 240_000 })

  test('movement and semantic destinations remain independently operable inside portrait and landscape safe areas', async ({ browser }) => {
    const viewports = [
      { width: 390, height: 844, label: 'portrait' },
      { width: 844, height: 390, label: 'landscape' },
    ]

    for (const viewport of viewports) {
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

        const layout = await page.evaluate(() => {
          const movementRect = document.querySelector<HTMLElement>('.urai-mobile-movement')?.getBoundingClientRect()
          const semanticNode = document.querySelector<HTMLElement>('.urai-home-spatial-runtime-layer > .home-semantic-navigation')
          const semanticRect = semanticNode?.getBoundingClientRect()
          const viewport = window.visualViewport
          if (!movementRect || !semanticRect || !semanticNode) return null
          return {
            movement: { left: movementRect.left, top: movementRect.top, right: movementRect.right, bottom: movementRect.bottom },
            semantic: { left: semanticRect.left, top: semanticRect.top, right: semanticRect.right, bottom: semanticRect.bottom },
            semanticOpacity: Number.parseFloat(getComputedStyle(semanticNode).opacity || '1'),
            viewport: { width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight },
            documentWidth: document.documentElement.scrollWidth,
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

        const firstDestination = semantic.getByRole('button').first()
        await firstDestination.focus()
        await expect(firstDestination).toBeFocused()
        const focused = await semantic.evaluate((element) => ({
          opacity: Number.parseFloat(getComputedStyle(element).opacity || '1'),
          buttons: [...element.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
            const rect = button.getBoundingClientRect()
            return { width: rect.width, height: rect.height }
          }),
        }))
        expect(focused.opacity, `${viewport.label} focus reveal`).toBeGreaterThan(0.9)
        for (const button of focused.buttons) {
          expect(button.width, `${viewport.label} destination width`).toBeGreaterThanOrEqual(48)
          expect(button.height, `${viewport.label} destination height`).toBeGreaterThanOrEqual(48)
        }
      } finally {
        await context.close()
      }
    }
  })
})
