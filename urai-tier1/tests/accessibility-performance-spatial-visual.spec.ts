import { expect, test } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3000'

test.use({ baseURL })

test.describe('URAI visual ownership and containment evidence', () => {
  test('Home direct destination controls remain non-dominant and accessible', async ({ page }) => {
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const navigation = page.getByRole('navigation', { name: 'Direct Home destinations' })
    await expect(navigation).toBeVisible({ timeout: 30_000 })
    await expect(navigation).toHaveAttribute('data-home-navigation-non-dominant', 'true')
    await expect(navigation.getByRole('button', { name: 'Open Ground directly', exact: true })).toBeVisible()
    await expect(navigation.getByRole('button', { name: 'Open Life Map directly', exact: true })).toBeVisible()
  })

  test('Life Map movement help is keyboard-operable', async ({ page }) => {
    await page.goto('/life-map?demo=1&overview=1&manifestId=replay-recovery-thread', { waitUntil: 'domcontentloaded' })
    const controls = page.locator('details.life-map-help')
    const body = controls.locator('.life-map-help__body')
    await expect(controls).not.toHaveAttribute('open', '')
    await expect(body).toBeHidden()

    const summary = controls.locator('summary')
    await summary.focus()
    await expect(summary).toBeFocused()
    await summary.press('Enter')
    await expect(controls).toHaveAttribute('open', '')
    await expect(body).toBeVisible()
    await expect(body.getByRole('button').first()).toBeVisible()
  })

  test('selected Life Map journey rail is painted, topmost, contained, and directly operable on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(page.getByRole('button', { name: 'Enter Focus', exact: true })).toBeVisible()

    const rail = page.getByTestId('life-map-journey-rail')
    const previous = rail.getByRole('button', { name: 'Previous visible life object' })
    const next = rail.getByRole('button', { name: 'Next visible life object' })
    const overview = rail.getByRole('button', { name: 'Overview', exact: true })
    await expect(rail).toBeVisible()
    await expect(rail).toHaveAttribute('data-selected', 'true')
    await expect(previous).toBeVisible()
    await expect(next).toBeVisible()
    await expect(overview).toBeVisible()

    const evidence = await rail.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const viewport = window.visualViewport
      const style = getComputedStyle(element)
      const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
        const buttonRect = button.getBoundingClientRect()
        const centerX = buttonRect.left + buttonRect.width / 2
        const centerY = buttonRect.top + buttonRect.height / 2
        const topmost = document.elementFromPoint(centerX, centerY)
        const buttonStyle = getComputedStyle(button)
        return {
          label: button.textContent?.trim() || '',
          width: buttonRect.width,
          height: buttonRect.height,
          left: buttonRect.left,
          right: buttonRect.right,
          top: buttonRect.top,
          bottom: buttonRect.bottom,
          topmostOwned: topmost === button || Boolean(topmost && button.contains(topmost)),
          pointerEvents: buttonStyle.pointerEvents,
          visibility: buttonStyle.visibility,
          opacity: Number.parseFloat(buttonStyle.opacity || '1'),
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
        visibility: style.visibility,
        opacity: Number.parseFloat(style.opacity || '1'),
        pointerEvents: style.pointerEvents,
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        buttons,
      }
    })

    await test.info().attach('life-map-selected-mobile-journey-rail.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.height).toBeGreaterThanOrEqual(60)
    expect(evidence.height).toBeLessThanOrEqual(66)
    expect(evidence.height / evidence.viewportHeight).toBeLessThan(0.1)
    expect(evidence.width).toBeLessThanOrEqual(evidence.viewportWidth - 20)
    expect(evidence.left).toBeGreaterThanOrEqual(0)
    expect(evidence.right).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    expect(evidence.top).toBeGreaterThanOrEqual(0)
    expect(evidence.bottom).toBeLessThanOrEqual(evidence.viewportHeight + 1)
    expect(evidence.visibility).toBe('visible')
    expect(evidence.opacity).toBeGreaterThan(0.9)
    expect(evidence.pointerEvents).not.toBe('none')
    expect(evidence.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(Number.parseFloat(evidence.borderTopWidth)).toBeGreaterThanOrEqual(1)
    expect(evidence.buttons.map((button) => button.label)).toEqual(['Previous', 'Next', 'Overview'])
    for (const button of evidence.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(48)
      expect(button.height).toBeGreaterThanOrEqual(48)
      expect(button.top).toBeGreaterThanOrEqual(evidence.top)
      expect(button.bottom).toBeLessThanOrEqual(evidence.bottom + 1)
      expect(button.topmostOwned).toBe(true)
      expect(button.pointerEvents).not.toBe('none')
      expect(button.visibility).toBe('visible')
      expect(button.opacity).toBeGreaterThan(0.9)
    }

    await next.click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advancedUrl = new URL(page.url())
    expect(advancedUrl.searchParams.get('memoryId')).toBe(advancedUrl.searchParams.get('node'))

    await previous.click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })

    await expect(overview).toBeVisible()
    await overview.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(page.getByRole('navigation', { name: 'Selected memory actions' })).toHaveCount(0)
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
