import { expect, test } from '@playwright/test'

const routes = [
  ['home', '/'],
  ['ground', '/ground'],
  ['life-map', '/life-map'],
  ['focus', '/focus?memoryId=seed-memory-bloom&manifestId=seed-memory-bloom&node=seed-memory-bloom&demo=1'],
  ['replay', '/replay?memoryId=seed-memory-bloom&manifestId=seed-memory-bloom&node=seed-memory-bloom&demo=1'],
] as const

test('retain route timing, long-task, frame, and heap evidence', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as Window & { __uraiLongTasks?: number[] }).__uraiLongTasks = []
    try {
      new PerformanceObserver((list) => {
        const target = (window as Window & { __uraiLongTasks?: number[] }).__uraiLongTasks
        for (const entry of list.getEntries()) target?.push(entry.duration)
      }).observe({ type: 'longtask', buffered: true })
    } catch {}
  })

  const measurements: Array<Record<string, unknown>> = []
  for (const [name, path] of routes) {
    const started = Date.now()
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    const metrics = await page.evaluate(async () => {
      const frameTimes: number[] = []
      await new Promise<void>((resolve) => {
        let previous = performance.now()
        let frames = 0
        const tick = (now: number) => {
          frameTimes.push(now - previous)
          previous = now
          frames += 1
          if (frames >= 120) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      const sorted = frameTimes.slice().sort((a, b) => a - b)
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      const longTasks = (window as Window & { __uraiLongTasks?: number[] }).__uraiLongTasks ?? []
      return {
        frameCount: frameTimes.length,
        frameP95Ms: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)],
        longTaskCount: longTasks.length,
        longestTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
        usedJSHeapSize: memory?.usedJSHeapSize ?? null,
      }
    })
    measurements.push({ route: name, navigationMs: Date.now() - started, ...metrics })
  }

  await test.info().attach('accessibility-performance-metrics.json', {
    body: JSON.stringify({ generatedAt: new Date().toISOString(), measurements }, null, 2),
    contentType: 'application/json',
  })
  expect(measurements).toHaveLength(routes.length)
})
