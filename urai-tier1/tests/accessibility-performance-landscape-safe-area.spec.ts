import { expect, test } from '@playwright/test'

const selection = '?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

for (const insets of [{ left: 59, right: 59 }, { left: 59, right: 0 }, { left: 0, right: 59 }]) {
  test(`landscape safe areas separate Focus and Replay at ${insets.left}/${insets.right}`, async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/focus' + selection, { waitUntil: 'domcontentloaded' })
    // Desktop Chromium has zero native cutout insets. Override the same CSS
    // properties consumed by production layout; keep its selectors and rules.
    await page.addStyleTag({ content: `:root { --urai-landscape-inset-left: ${insets.left}px; --urai-landscape-inset-right: ${insets.right}px; }` })
    const focus = page.locator('[data-testid="urai-final-focus-chamber"]:visible')
    await expect(focus).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    const heading = (await focus.locator('.focusHeading').boundingBox())!
    const context = (await focus.locator('.memoryMeaning').boundingBox())!
    const controls = (await focus.locator('.focusControls').boundingBox())!
    expect(heading).not.toBeNull()
    expect(context).not.toBeNull()
    expect(controls).not.toBeNull()
    expect(heading.x + heading.width).toBeLessThanOrEqual(controls.x)
    expect(context.x + context.width).toBeLessThanOrEqual(controls.x)
    for (const rect of [heading, context, controls]) {
      expect(rect.x).toBeGreaterThanOrEqual(insets.left)
      expect(rect.x + rect.width).toBeLessThanOrEqual(844 - insets.right)
    }
    await focus.locator('.focusControls').getByRole('button', { name: /Open Replay for/ }).click()
    await expect.poll(() => new URL(page.url()).pathname.split('/').filter(Boolean).join('/')).toBe('replay')
    await page.addStyleTag({ content: `:root { --urai-landscape-inset-left: ${insets.left}px; --urai-landscape-inset-right: ${insets.right}px; }` })
    const replay = page.getByTestId('cinematic-replay-client')
    await expect(replay).toHaveAttribute('data-replay-media-ready', 'true')
    const header = (await replay.locator('header').boundingBox())!
    const caption = (await replay.locator('.caption').boundingBox())!
    const transport = (await replay.locator('.memoryTempo').boundingBox())!
    expect(header).not.toBeNull()
    expect(caption).not.toBeNull()
    expect(transport).not.toBeNull()
    expect(header.x + header.width).toBeLessThanOrEqual(caption.x)
    expect(caption.y + caption.height).toBeLessThanOrEqual(transport.y)
    for (const rect of [header, caption, transport]) {
      expect(rect.x).toBeGreaterThanOrEqual(insets.left)
      expect(rect.x + rect.width).toBeLessThanOrEqual(844 - insets.right)
    }
    await replay.getByRole('button', { name: 'Continue memory', exact: true }).click()
    await expect(replay).toHaveAttribute('data-playing', 'true')
    await replay.getByRole('button', { name: 'Pause memory', exact: true }).click()
    await expect(replay).toHaveAttribute('data-playing', 'false')
  })
}
