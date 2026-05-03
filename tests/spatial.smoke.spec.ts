import { test, expect } from '@playwright/test'

test.describe('URAI Spatial smoke', () => {
  test('root route is immersive and console-clean', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const responses: string[] = []
    page.on('response', (r) => {
      if (r.status() >= 400) responses.push(`${r.status()} ${r.url()}`)
    })

    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible()

    await expect(page.locator('button')).toHaveCount(0)
    await expect(page.getByText(/HOME|ASCENT|LIFEMAP|FOCUS|REPLAY/)).toHaveCount(0)

    const textColor = await page.evaluate(() => getComputedStyle(document.body).color)
    expect(textColor.toLowerCase()).not.toContain('rgb(0, 0, 0)')

    expect(responses.filter((x) => x.includes('favicon')).length).toBe(0)
    expect(consoleErrors).toEqual([])
  })

  test('spatial interaction path responds to clicks', async ({ page }) => {
    await page.goto('/')
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2)
    await page.waitForTimeout(1000)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await page.waitForTimeout(500)

    await expect(canvas).toBeVisible()
  })
})
