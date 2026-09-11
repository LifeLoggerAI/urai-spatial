import { expect, test } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3000'

test.use({ baseURL })

test.describe('URAI visual ownership and containment evidence', () => {
  test.describe.configure({ timeout: 90_000 })
  test('Home direct destination controls remain non-dominant and accessible', async ({ page }) => {
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const navigation = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    await expect(navigation).toBeVisible({ timeout: 30_000 })
    await expect(navigation).toHaveAttribute('data-home-navigation-non-dominant', 'true')
    await expect(navigation.getByRole('link', { name: 'Open Ground directly', exact: true })).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Open Life Map directly', exact: true })).toBeVisible()
  })

  test('Life Map semantic search is keyboard-operable', async ({ page }) => {
    await page.goto('/life-map?demo=1&overview=1&manifestId=replay-recovery-thread', { waitUntil: 'domcontentloaded' })
    const trigger = page.locator('.life-map-search-trigger').first()
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAccessibleName('Search and navigate Life Map')
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const navigator = page.locator('section.life-map-navigator[aria-label="Search and filter Life Map"]').first()
    await expect(navigator).toBeVisible()
    await expect(navigator.locator('button[data-life-map-semantic-result]').first()).toBeVisible()
  })

  test('selected Life Map journey controls preserve identity and remain operable on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')

    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    await expect(actions).toBeVisible()

    const evidence = await page.evaluate(() => {
      const actionNav = document.querySelector<HTMLElement>('nav[aria-label="Selected memory actions"]')
      const viewport = window.visualViewport
      const describe = (element: HTMLElement | null) => {
        if (!element) return null
        const rect = element.getBoundingClientRect()
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
      }
      const buttons = actionNav ? [...actionNav.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
        const rect = button.getBoundingClientRect()
        const topmost = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        return {
          label: button.querySelector('strong')?.textContent?.trim() || button.textContent?.trim() || '',
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          topmostOwned: topmost === button || Boolean(topmost && button.contains(topmost)),
          pointerEvents: getComputedStyle(button).pointerEvents,
        }
      }) : []
      return {
        viewportWidth: viewport?.width ?? window.innerWidth,
        viewportHeight: viewport?.height ?? window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        action: describe(actionNav),
        buttons,
      }
    })

    await test.info().attach('life-map-selected-mobile-current-journey-controls.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.action).not.toBeNull()
    expect(evidence.documentWidth).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    for (const rect of [evidence.action!]) {
      expect(rect.left).toBeGreaterThanOrEqual(0)
      expect(rect.right).toBeLessThanOrEqual(evidence.viewportWidth + 1)
      expect(rect.top).toBeGreaterThanOrEqual(0)
      expect(rect.bottom).toBeLessThanOrEqual(evidence.viewportHeight + 1)
    }
    expect(evidence.buttons.map((button) => button.label)).toEqual(['Enter Focus', 'Replay', 'Overview'])
    for (const button of evidence.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(48)
      expect(button.height).toBeGreaterThanOrEqual(48)
      expect(button.topmostOwned).toBe(true)
      expect(button.pointerEvents).not.toBe('none')
    }

    await page.keyboard.press('ArrowRight')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advanced = new URL(page.url())
    expect(advanced.searchParams.get('memoryId')).toBe(advanced.searchParams.get('node'))

    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })

    await page.keyboard.press('o')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
  })

  test('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')

    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    const focus = actions.getByRole('button', { name: /Enter Focus$/ })
    const replay = actions.getByRole('button', { name: /Replay$/ })
    const overview = actions.getByRole('button', { name: /overview$/i })
    await expect(actions).toBeVisible()
    await expect(focus).toBeVisible()
    await expect(replay).toBeVisible()
    await expect(overview).toBeVisible()

    const evidence = await actions.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const viewport = window.visualViewport
      const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
        const buttonRect = button.getBoundingClientRect()
        const centerX = buttonRect.left + buttonRect.width / 2
        const centerY = buttonRect.top + buttonRect.height / 2
        const topmost = document.elementFromPoint(centerX, centerY)
        return {
          label: button.querySelector('strong')?.textContent?.trim() || button.textContent?.trim() || '',
          left: buttonRect.left,
          top: buttonRect.top,
          right: buttonRect.right,
          bottom: buttonRect.bottom,
          width: buttonRect.width,
          height: buttonRect.height,
          topmostOwned: topmost === button || Boolean(topmost && button.contains(topmost)),
          pointerEvents: getComputedStyle(button).pointerEvents,
        }
      })
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        viewportWidth: viewport?.width ?? window.innerWidth,
        viewportHeight: viewport?.height ?? window.innerHeight,
        buttons,
      }
    })

    await test.info().attach('life-map-selected-mobile-action-owner.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.height).toBeGreaterThanOrEqual(62)
    expect(evidence.height).toBeLessThanOrEqual(160)
    expect(evidence.height / evidence.viewportHeight).toBeLessThan(0.2)
    expect(evidence.left).toBeGreaterThanOrEqual(0)
    expect(evidence.right).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    expect(evidence.top).toBeGreaterThanOrEqual(0)
    expect(evidence.bottom).toBeLessThanOrEqual(evidence.viewportHeight + 1)
    expect(evidence.buttons.map((button) => button.label)).toEqual(['Enter Focus', 'Replay', 'Overview'])
    for (const button of evidence.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(48)
      expect(button.height).toBeGreaterThanOrEqual(48)
      expect(button.topmostOwned).toBe(true)
      expect(button.pointerEvents).not.toBe('none')
    }

    await overview.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
  })
})
