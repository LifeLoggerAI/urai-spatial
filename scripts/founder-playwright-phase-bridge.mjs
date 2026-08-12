import Module from 'node:module'
import path from 'node:path'

const originalLoad = Module._load
const FOUNDER_ROOT_SELECTOR = '[data-testid="urai-true-3d-life-map"]'
const TIER_ONE_REQUIRE_PARENT_SUFFIX = path.join('urai-tier1', 'package.json')
let bridgedPlaywrightDelivered = false

function bindMember(target, key) {
  const value = Reflect.get(target, key, target)
  return typeof value === 'function' ? value.bind(target) : value
}

function wrapLocator(locator, page, bridgeState) {
  return new Proxy(locator, {
    get(target, key) {
      if (key === 'first') return () => wrapLocator(target.first(), page, bridgeState)
      if (key === 'last') return () => wrapLocator(target.last(), page, bridgeState)
      if (key === 'nth') return (index) => wrapLocator(target.nth(index), page, bridgeState)
      if (key === 'locator') return (...args) => wrapLocator(target.locator(...args), page, bridgeState)
      if (key === 'filter') return (options) => wrapLocator(target.filter(options), page, bridgeState)
      if (key === 'click' || key === 'tap') {
        return async (...args) => {
          if (bridgeState.armPromise) await bridgeState.armPromise
          return target[key](...args)
        }
      }
      if (key !== 'evaluate') return bindMember(target, key)

      return async (fn, arg, ...rest) => {
        const source = String(fn)
        const isFounderPhaseWitness = Boolean(
          arg
          && typeof arg.expectedPhase === 'string'
          && Number.isFinite(arg.timeout)
          && source.includes('data-life-map-phase')
          && source.includes('new MutationObserver')
          && source.includes('requestAnimationFrame')
        )
        if (!isFounderPhaseWitness) return target.evaluate(fn, arg, ...rest)

        const startedAt = Date.now()
        const deadline = startedAt + arg.timeout
        const timeline = []
        let lastPhase = Symbol('unseen')
        let lastSample = null
        let observedAtMs = null

        const sample = async (sampleSource) => {
          try {
            const roots = page.locator(FOUNDER_ROOT_SELECTOR)
            const count = await roots.count()
            if (count !== 1) {
              lastSample = { count, phase: null, source: sampleSource }
              return lastSample
            }
            const phase = await roots.first().getAttribute('data-life-map-phase')
            lastSample = { count, phase, source: sampleSource }
            if (phase !== lastPhase) {
              lastPhase = phase
              timeline.push({ phase, atMs: Date.now() - startedAt, source: sampleSource })
            }
            return lastSample
          } catch (error) {
            lastSample = { count: null, phase: null, source: sampleSource, transient: String(error) }
            return lastSample
          }
        }

        const armPromise = sample('armed')
        bridgeState.armPromise = armPromise

        const witness = (async () => {
          try {
            await armPromise
            while (Date.now() < deadline) {
              const state = await sample('playwright-poll')
              if (state.count === 1 && state.phase === arg.expectedPhase) {
                if (observedAtMs === null) observedAtMs = Date.now() - startedAt
                try {
                  const frame = await page.evaluate(({ selector }) => new Promise((resolve) => {
                    window.requestAnimationFrame((frameTime) => {
                      const roots = document.querySelectorAll(selector)
                      const phase = roots.length === 1 ? roots[0].getAttribute('data-life-map-phase') : null
                      resolve({ count: roots.length, phase, frameTime })
                    })
                  }), { selector: FOUNDER_ROOT_SELECTOR })
                  if (frame.count === 1 && frame.phase === arg.expectedPhase) {
                    return {
                      expectedPhase: arg.expectedPhase,
                      observedAtMs,
                      renderedFrameAtMs: Date.now() - startedAt,
                      renderedFramePhase: frame.phase,
                      timeline,
                    }
                  }
                  await sample('phase-advanced-before-frame')
                } catch (error) {
                  lastSample = { count: null, phase: null, source: 'frame-context-replaced', transient: String(error) }
                }
              }
              await new Promise((resolve) => setTimeout(resolve, 5))
            }
            throw new Error(`data-life-map-phase=${arg.expectedPhase} did not survive a rendered frame within ${arg.timeout}ms; last=${JSON.stringify(lastSample)}; timeline=${JSON.stringify(timeline)}`)
          } finally {
            if (bridgeState.armPromise === armPromise) bridgeState.armPromise = null
          }
        })()

        return witness
      }
    },
  })
}

function wrapPage(page) {
  const bridgeState = { armPromise: null }
  return new Proxy(page, {
    get(target, key) {
      if (key === 'locator') return (...args) => wrapLocator(target.locator(...args), target, bridgeState)
      if (key === 'getByRole') return (...args) => wrapLocator(target.getByRole(...args), target, bridgeState)
      return bindMember(target, key)
    },
  })
}

function wrapContext(context) {
  return new Proxy(context, {
    get(target, key) {
      if (key === 'newPage') return async (...args) => wrapPage(await target.newPage(...args))
      return bindMember(target, key)
    },
  })
}

function wrapBrowser(browser) {
  return new Proxy(browser, {
    get(target, key) {
      if (key === 'newContext') return async (...args) => wrapContext(await target.newContext(...args))
      return bindMember(target, key)
    },
  })
}

function wrapBrowserType(browserType) {
  return new Proxy(browserType, {
    get(target, key) {
      if (key === 'launch') return async (...args) => wrapBrowser(await target.launch(...args))
      return bindMember(target, key)
    },
  })
}

function wrapPlaywright(playwright) {
  return new Proxy(playwright, {
    get(target, key) {
      if (key === 'chromium') return wrapBrowserType(target.chromium)
      return bindMember(target, key)
    },
  })
}

Module._load = function founderScopedPlaywrightLoad(request, parent, isMain) {
  const parentFile = parent?.filename ? path.normalize(parent.filename) : ''
  const shouldBridge = !bridgedPlaywrightDelivered
    && request === 'playwright'
    && parentFile.endsWith(TIER_ONE_REQUIRE_PARENT_SUFFIX)
  const loaded = originalLoad.apply(this, arguments)
  if (!shouldBridge) return loaded

  bridgedPlaywrightDelivered = true
  Module._load = originalLoad
  return wrapPlaywright(loaded)
}
