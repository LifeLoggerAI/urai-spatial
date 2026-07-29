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

  test('movement, ambience, provenance, and safe areas remain independently operable in portrait and landscape touch contexts', async ({ browser }) => {
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
        const discreet = page.locator('.home-discreet-controls')
        await expect(movement).toBeVisible()
        await expect(discreet).toBeVisible()

        const closedLayout = await page.evaluate(() => {
          const movementRect = document.querySelector<HTMLElement>('.urai-mobile-movement')?.getBoundingClientRect()
          const discreetRect = document.querySelector<HTMLElement>('.home-discreet-controls')?.getBoundingClientRect()
          const viewport = window.visualViewport
          if (!movementRect || !discreetRect) return null
          return {
            movement: { left: movementRect.left, top: movementRect.top, right: movementRect.right, bottom: movementRect.bottom },
            discreet: { left: discreetRect.left, top: discreetRect.top, right: discreetRect.right, bottom: discreetRect.bottom },
            viewport: { width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight },
            documentWidth: document.documentElement.scrollWidth,
          }
        })

        expect(closedLayout, `${viewport.label} closed layout`).not.toBeNull()
        expect(rectanglesOverlap(closedLayout!.movement, closedLayout!.discreet), `${viewport.label} closed controls overlap`).toBe(false)
        for (const rect of [closedLayout!.movement, closedLayout!.discreet]) {
          expect(rect.left, `${viewport.label} left containment`).toBeGreaterThanOrEqual(0)
          expect(rect.top, `${viewport.label} top containment`).toBeGreaterThanOrEqual(0)
          expect(rect.right, `${viewport.label} right containment`).toBeLessThanOrEqual(closedLayout!.viewport.width + 1)
          expect(rect.bottom, `${viewport.label} bottom containment`).toBeLessThanOrEqual(closedLayout!.viewport.height + 1)
        }
        expect(closedLayout!.documentWidth, `${viewport.label} document width`).toBeLessThanOrEqual(closedLayout!.viewport.width + 1)

        await discreet.getByRole('button', { name: 'Why am I seeing this?' }).click()
        const provenance = page.getByRole('complementary', { name: 'Home source explanation' })
        await expect(provenance).toBeVisible()

        const openLayout = await page.evaluate(() => {
          const movementRect = document.querySelector<HTMLElement>('.urai-mobile-movement')?.getBoundingClientRect()
          const provenanceRect = document.querySelector<HTMLElement>('.home-provenance')?.getBoundingClientRect()
          const viewport = window.visualViewport
          if (!movementRect || !provenanceRect) return null
          return {
            movement: { left: movementRect.left, top: movementRect.top, right: movementRect.right, bottom: movementRect.bottom },
            provenance: { left: provenanceRect.left, top: provenanceRect.top, right: provenanceRect.right, bottom: provenanceRect.bottom },
            viewport: { width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight },
          }
        })

        expect(openLayout, `${viewport.label} open layout`).not.toBeNull()
        expect(rectanglesOverlap(openLayout!.movement, openLayout!.provenance), `${viewport.label} provenance overlap`).toBe(false)
        expect(openLayout!.provenance.left, `${viewport.label} provenance left`).toBeGreaterThanOrEqual(0)
        expect(openLayout!.provenance.top, `${viewport.label} provenance top`).toBeGreaterThanOrEqual(0)
        expect(openLayout!.provenance.right, `${viewport.label} provenance right`).toBeLessThanOrEqual(openLayout!.viewport.width + 1)
        expect(openLayout!.provenance.bottom, `${viewport.label} provenance bottom`).toBeLessThanOrEqual(openLayout!.viewport.height + 1)
      } finally {
        await context.close()
      }
    }
  })
})
