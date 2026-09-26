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

  test('desktop canvas fills the viewport without CSS overscan or shifted pointer geometry', async ({ browser }) => {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      const context = await browser.newContext({ baseURL, viewport })
      const page = await context.newPage()
      try {
        await page.goto('/home/', { waitUntil: 'domcontentloaded' })
        const home = page.locator(homeOwnerSelector)
        await waitForHomeWorld(home)
        const canvas = home.locator('canvas')
        const bounds = await canvas.boundingBox()
        expect(bounds).not.toBeNull()
        expect(bounds!.x).toBe(0)
        expect(bounds!.y).toBe(0)
        expect(bounds!.width).toBe(viewport.width)
        expect(bounds!.height).toBe(viewport.height)
        const pointerGeometry = await canvas.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return {
            transform: getComputedStyle(element).transform,
            xScale: rect.width / element.clientWidth,
            yScale: rect.height / element.clientHeight,
          }
        })
        expect(pointerGeometry).toEqual({ transform: 'none', xScale: 1, yScale: 1 })
      } finally {
        await context.close()
      }
    }
  })

  test('movement and semantic destinations remain independently operable inside portrait and landscape safe areas', async ({ browser }) => {
    const viewports = [
      { width: 320, height: 900, label: 'narrow portrait' },
      { width: 390, height: 844, label: 'portrait' },
      { width: 430, height: 932, label: 'large portrait' },
      { width: 568, height: 320, label: 'short landscape' },
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

        const semantic = page.getByRole('navigation', { name: 'Accessible Home destinations' })
        await expect(semantic).toBeVisible()
        await expect(semantic).toHaveAttribute('data-home-navigation-owner', 'runtime-boundary')
        await expect(semantic).toHaveAttribute('data-home-navigation-non-dominant', 'true')

        await expect(page.getByRole('button', { name: 'Enter first-person Home through your Avatar' })).toHaveCount(0)
        await expect(home).toHaveAttribute('data-home-stable-state', 'AVATAR_HOME_FIRST_PERSON', { timeout: 45_000 })
        await expect(home).toHaveAttribute('data-home-embodied-self', 'camera-only-first-person-home')
        await expect(home).toHaveAttribute('data-home-presence-presentation', 'bodyless-first-person-home')
        await expect(home).toHaveAttribute('data-home-non-xr-body-policy', 'camera-only-no-hands-body-rig')
        await expect(home).toHaveAttribute('data-home-presence-policy', 'direct-first-person-camera-only-no-hands-body-rig')
        await expect(home).toHaveAttribute('data-home-avatar-activation-gate', 'none-direct-first-person-home')
        await expect(home).toHaveAttribute('data-home-movement', 'shared-keyboard-touch-walk-look-interact')

        const movement = page.getByRole('group', { name: 'Move through Home' })
        await expect(movement).toBeVisible()

        const layout = await page.evaluate(() => {
          const movementRect = document.querySelector<HTMLElement>('.urai-mobile-movement')?.getBoundingClientRect()
          const semanticNode = document.querySelector<HTMLElement>('.urai-home-spatial-runtime-layer > .home-semantic-navigation')
          const semanticRect = semanticNode?.getBoundingClientRect()
          const helpRect = document.querySelector<HTMLElement>('.urai-movement-help')?.getBoundingClientRect()
          const viewport = window.visualViewport
          if (!movementRect || !semanticRect || !semanticNode || !helpRect) return null
          return {
            movement: { left: movementRect.left, top: movementRect.top, right: movementRect.right, bottom: movementRect.bottom },
            semantic: { left: semanticRect.left, top: semanticRect.top, right: semanticRect.right, bottom: semanticRect.bottom },
            help: { left: helpRect.left, top: helpRect.top, right: helpRect.right, bottom: helpRect.bottom },
            semanticOpacity: Number.parseFloat(getComputedStyle(semanticNode).opacity || '1'),
            viewport: { width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight },
            documentWidth: document.documentElement.scrollWidth,
          }
        })

        expect(layout, `${viewport.label} layout`).not.toBeNull()
        expect(rectanglesOverlap(layout!.movement, layout!.semantic), `${viewport.label} controls overlap`).toBe(false)
        expect(rectanglesOverlap(layout!.help, layout!.semantic), `${viewport.label} help and destinations overlap`).toBe(false)
        for (const rect of [layout!.movement, layout!.semantic, layout!.help]) {
          expect(rect.left, `${viewport.label} left containment`).toBeGreaterThanOrEqual(0)
          expect(rect.top, `${viewport.label} top containment`).toBeGreaterThanOrEqual(0)
          expect(rect.right, `${viewport.label} right containment`).toBeLessThanOrEqual(layout!.viewport.width + 1)
          expect(rect.bottom, `${viewport.label} bottom containment`).toBeLessThanOrEqual(layout!.viewport.height + 1)
        }
        expect(layout!.semanticOpacity, `${viewport.label} destinations are readable before focus`).toBe(1)
        expect(layout!.documentWidth, `${viewport.label} document width`).toBeLessThanOrEqual(layout!.viewport.width + 1)

        const firstDestination = semantic.getByRole('button').first()
        await firstDestination.focus()
        await expect(firstDestination).toBeFocused()
        const focused = await semantic.evaluate((element) => ({
          opacity: Number.parseFloat(getComputedStyle(element).opacity || '1'),
          buttons: [...element.querySelectorAll<HTMLElement>('button,a')].map((button) => {
            const rect = button.getBoundingClientRect()
            return { width: rect.width, height: rect.height, fontSize: Number.parseFloat(getComputedStyle(button).fontSize) }
          }),
        }))
        expect(focused.opacity, `${viewport.label} focus reveal`).toBeGreaterThan(0.9)
        for (const button of focused.buttons) {
          expect(button.width, `${viewport.label} destination width`).toBeGreaterThanOrEqual(48)
          expect(button.height, `${viewport.label} destination height`).toBeGreaterThanOrEqual(48)
          expect(button.fontSize, `${viewport.label} destination label size`).toBeGreaterThanOrEqual(12)
        }
        // Home has one native shortcut and one authored world Orb. The generic
        // companion trigger belongs to other realms; Home only mounts Close.
        const companion = page.locator('.urai-world-companion[data-destination="home"]')
        await expect(companion).toHaveCount(1)
        await expect(companion).toHaveAttribute('data-hydrated', 'true')
        await expect(companion.locator('[data-world-target="orb-controls"]')).toHaveCount(0)
        await firstDestination.click()
        const closeOrb = companion.getByRole('button', { name: 'Close UrAi Orb companion', exact: true })
        await expect(closeOrb).toBeVisible()
        await expect(closeOrb).toHaveText('Close')
        await closeOrb.click()
        await expect(firstDestination).toBeFocused()
        await expect(companion.locator('[data-world-target="orb-controls"]')).toHaveCount(0)
        // The authored 3D Orb opens without an HTML activator. Escape must
        // still restore focus to the native Home Orb shortcut.
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('urai:world-orb-open', { detail: {} })))
        await expect(closeOrb).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(firstDestination).toBeFocused()
        const forward = movement.getByRole('button', { name: 'Move forward', exact: true })
        await expect(forward).toBeVisible()
        await forward.dispatchEvent('pointerdown')
        await expect(forward).toHaveAttribute('data-active', 'true')
        await forward.dispatchEvent('pointercancel')
        await expect(forward).toHaveAttribute('data-active', 'false')
        await page.getByRole('button', { name: 'Move through Home', exact: true }).click()
        await expect(page.locator('.urai-movement-help')).toHaveAttribute('open', '')
        await expect(page.getByText('Move through your Home in bodyless first person without a synthetic body overlay.', { exact: true })).toBeVisible()
      } finally {
        await context.close()
      }
    }
  })
})
