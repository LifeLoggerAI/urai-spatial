import { expect, test } from '@playwright/test'

const routes = [
  ['home', '/'],
  ['ground', '/ground'],
  ['life-map', '/life-map'],
  ['focus', '/focus?memoryId=seed-memory-bloom&manifestId=seed-memory-bloom&node=seed-memory-bloom&demo=1'],
  ['replay', '/replay?memoryId=seed-memory-bloom&manifestId=seed-memory-bloom&node=seed-memory-bloom&demo=1'],
] as const

const DESKTOP_FRAME_P95_BUDGET_MS = 20
const MOBILE_FRAME_P95_BUDGET_MS = 33.3
const STEADY_STATE_LONG_TASK_BUDGET = 1
const STEADY_STATE_LONGEST_TASK_BUDGET_MS = 100
const MAX_HEAP_GROWTH_BYTES = 32 * 1024 * 1024
const JOURNEY_CYCLES = 5

type Profile = {
  name: 'desktop' | 'mobile'
  viewport: { width: number; height: number }
  frameP95BudgetMs: number
}

type RendererInfo = {
  renderer: string | null
  vendor: string | null
  hardwareAcceleration: boolean
}

const profiles: Profile[] = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, frameP95BudgetMs: DESKTOP_FRAME_P95_BUDGET_MS },
  { name: 'mobile', viewport: { width: 393, height: 873 }, frameP95BudgetMs: MOBILE_FRAME_P95_BUDGET_MS },
]

type RouteMeasurement = {
  profile: Profile['name']
  route: string
  navigationMs: number
  frameCount: number
  frameP95Ms: number | null
  longTaskCount: number
  longestTaskMs: number
  usedJSHeapSize: number | null
}

test.describe('production accessibility performance budgets', () => {
  for (const profile of profiles) {
    test(`${profile.name} route frame, long-task, and five-cycle heap budgets`, async ({ page }) => {
      test.setTimeout(360_000)
      await page.setViewportSize(profile.viewport)
      await page.addInitScript(() => {
        ;(window as Window & { __uraiLongTasks?: number[] }).__uraiLongTasks = []
        try {
          new PerformanceObserver((list) => {
            const target = (window as Window & { __uraiLongTasks?: number[] }).__uraiLongTasks
            for (const entry of list.getEntries()) target?.push(entry.duration)
          }).observe({ type: 'longtask', buffered: true })
        } catch {}
      })

      const routeMeasurements: RouteMeasurement[] = []
      const cycleHeapSizes: number[] = []
      let rendererInfo: RendererInfo | null = null

      for (let cycle = 0; cycle < JOURNEY_CYCLES; cycle += 1) {
        for (const [route, path] of routes) {
          const started = Date.now()
          await page.goto(path, { waitUntil: 'load' })
          await expect(page.locator('body')).toBeVisible()
          if (rendererInfo === null) {
            rendererInfo = await page.evaluate(() => {
              const canvas = document.createElement('canvas')
              const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
              if (!gl) return { renderer: null, vendor: null, hardwareAcceleration: false }
              const debug = gl.getExtension('WEBGL_debug_renderer_info')
              const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null
              const vendor = debug ? String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : null
              const identity = `${vendor ?? ''} ${renderer ?? ''}`
              return {
                renderer,
                vendor,
                hardwareAcceleration: Boolean(debug && renderer && !/swiftshader|llvmpipe|software|microsoft basic render/i.test(identity)),
              }
            })
          }
          await page.evaluate(async () => {
            await document.fonts?.ready
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
          })
          await page.waitForTimeout(cycle === 0 ? 1_000 : 250)

          if (cycle !== 0) continue

          const metrics = await page.evaluate(async () => {
            ;(window as Window & { __uraiLongTasks?: number[] }).__uraiLongTasks = []
            const frameTimes: number[] = []
            await new Promise<void>((resolve) => {
              let previous = performance.now()
              let frames = 0
              let finished = false
              const timeoutId = window.setTimeout(finish, 5_000)

              function finish() {
                if (finished) return
                finished = true
                window.clearTimeout(timeoutId)
                resolve()
              }

              function tick(now: number) {
                if (finished) return
                frameTimes.push(now - previous)
                previous = now
                frames += 1
                if (frames >= 120) finish()
                else requestAnimationFrame(tick)
              }

              requestAnimationFrame(tick)
            })
            const sorted = frameTimes.slice().sort((a, b) => a - b)
            const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
            const longTasks = (window as Window & { __uraiLongTasks?: number[] }).__uraiLongTasks ?? []
            return {
              frameCount: frameTimes.length,
              frameP95Ms: sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] : null,
              longTaskCount: longTasks.length,
              longestTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
              usedJSHeapSize: memory?.usedJSHeapSize ?? null,
            }
          })

          routeMeasurements.push({
            profile: profile.name,
            route,
            navigationMs: Date.now() - started,
            ...metrics,
          })
        }

        const cycleHeap = await page.evaluate(() => {
          const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
          return memory?.usedJSHeapSize ?? null
        })
        if (cycleHeap !== null) cycleHeapSizes.push(cycleHeap)
      }

      const heapGrowthBytes = cycleHeapSizes.length > 1
        ? cycleHeapSizes[cycleHeapSizes.length - 1] - cycleHeapSizes[0]
        : null
      const evidence = {
        generatedAt: new Date().toISOString(),
        profile,
        serverMode: 'static-export',
        renderer: rendererInfo,
        budgetStatus: rendererInfo?.hardwareAcceleration ? 'ENFORCED' : 'NOT_AVAILABLE_HARDWARE_RENDERER',
        routeMeasurements,
        cycleHeapSizes,
        heapGrowthBytes,
        budgets: {
          frameP95Ms: profile.frameP95BudgetMs,
          steadyStateLongTaskCount: STEADY_STATE_LONG_TASK_BUDGET,
          steadyStateLongestTaskMs: STEADY_STATE_LONGEST_TASK_BUDGET_MS,
          maxHeapGrowthBytes: MAX_HEAP_GROWTH_BYTES,
          journeyCycles: JOURNEY_CYCLES,
        },
      }

      await test.info().attach(`accessibility-performance-metrics-${profile.name}.json`, {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      })

      expect(routeMeasurements).toHaveLength(routes.length)
      expect(rendererInfo).not.toBeNull()
      for (const measurement of routeMeasurements) {
        expect(measurement.frameCount, `${profile.name}/${measurement.route} frame evidence`).toBeGreaterThan(0)
        expect(measurement.frameP95Ms, `${profile.name}/${measurement.route} p95 frame time`).not.toBeNull()
      }
      if (rendererInfo?.hardwareAcceleration) {
        for (const measurement of routeMeasurements) {
          expect(measurement.frameCount, `${profile.name}/${measurement.route} hardware frame sample`).toBeGreaterThanOrEqual(90)
          expect(measurement.frameP95Ms ?? Number.POSITIVE_INFINITY, `${profile.name}/${measurement.route} p95 frame budget`).toBeLessThanOrEqual(profile.frameP95BudgetMs)
          expect(measurement.longTaskCount, `${profile.name}/${measurement.route} steady-state long tasks`).toBeLessThanOrEqual(STEADY_STATE_LONG_TASK_BUDGET)
          expect(measurement.longestTaskMs, `${profile.name}/${measurement.route} longest steady-state task`).toBeLessThanOrEqual(STEADY_STATE_LONGEST_TASK_BUDGET_MS)
        }
      } else {
        expect(evidence.budgetStatus).toBe('NOT_AVAILABLE_HARDWARE_RENDERER')
      }
      expect(cycleHeapSizes).toHaveLength(JOURNEY_CYCLES)
      expect(heapGrowthBytes ?? Number.POSITIVE_INFINITY, `${profile.name} heap growth across five route cycles`).toBeLessThanOrEqual(MAX_HEAP_GROWTH_BYTES)
    })
  }
})
