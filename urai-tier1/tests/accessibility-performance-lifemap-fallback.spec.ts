import { expect, test, type Locator } from '@playwright/test'

test.use({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce', launchOptions: { args: ['--disable-webgl'] } })

async function expectVisibleHitTarget(target: Locator) {
  const geometry = await target.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return {
      withinViewport: box.left >= -1 && box.top >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1,
      receivesHit: element.contains(hit),
    }
  })
  expect(geometry).toEqual({ withinViewport: true, receivesHit: true })
}

test('selected star actions are on screen before another key or scroll', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'This profile uses Chromium with WebGL disabled.')
  await page.goto('/life-map')
  await page.getByRole('button', { name: 'Open disclosed sample' }).click()
  for (const title of ['The Quiet Reset', 'Protected Chapter']) {
    await page.getByRole('button', { name: 'Search and navigate Life Map' }).press('Enter')
    const search = page.getByRole('region', { name: 'Search and filter Life Map' })
    await search.getByRole('textbox').fill(title)
    await search.getByRole('button', { name: title, exact: true }).press('Enter')
    const card = page.getByRole('complementary', { name: 'Selected life object details' })
    const heading = card.getByRole('heading', { name: title })
    const focus = card.getByRole('button', { name: 'Enter Focus' })
    await expect(heading).toBeFocused()
    await expectVisibleHitTarget(heading)
    await expectVisibleHitTarget(card.getByRole('link', { name: 'Return Home' }))
    if (title === 'Protected Chapter') {
      await expect(focus).toBeDisabled()
      await expect(card.getByRole('button', { name: 'Replay', exact: true })).toBeDisabled()
    } else {
      await expectVisibleHitTarget(focus)
      await page.keyboard.press('Tab')
      await expect(focus).toBeFocused()
    }
  }
})
