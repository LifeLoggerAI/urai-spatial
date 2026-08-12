import Module from 'node:module'
import path from 'node:path'

const originalLoad = Module._load
const BRIDGE_NAME = '__uraiFounderHarnessPhaseBridge'
const TIER_ONE_REQUIRE_PARENT_SUFFIX = path.join('urai-tier1', 'package.json')
let sequence = 0
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

        const token = `founder-phase-${++sequence}-${arg.expectedPhase}`
        let timeoutHandle
        const witness = new Promise((resolve, reject) => {
          timeoutHandle = setTimeout(() => {
            bridgeState.waiters.delete(token)
            reject(new Error(`data-life-map-phase=${arg.expectedPhase} did not reach the non-blocking bridge within ${arg.timeout}ms`))
          }, arg.timeout + 5_000)
          bridgeState.waiters.set(token, (payload) => {
            clearTimeout(timeoutHandle)
            bridgeState.waiters.delete(token)
            if (payload?.error) reject(new Error(payload.error))
            else resolve(payload)
          })
        })

        await target.evaluate((element, input) => {
          const startedAt = performance.now()
          const timeline = []
          let lastPhase = null
          let settled = false
          let framePending = false
          let timer = 0

          const cleanup = () => {
            observer.disconnect()
            window.clearTimeout(timer)
          }
          const publish = (payload) => {
            Promise.resolve(window[input.bridgeName]?.(payload)).catch(() => {})
          }
          const record = (source) => {
            const phase = element.getAttribute('data-life-map-phase')
            if (phase !== lastPhase) {
              lastPhase = phase
              timeline.push({ phase, atMs: performance.now() - startedAt, source })
            }
            if (phase !== input.expectedPhase || framePending || settled) return
            framePending = true
            window.requestAnimationFrame((frameTime) => {
              framePending = false
              if (settled) return
              const framePhase = element.getAttribute('data-life-map-phase')
              if (framePhase !== input.expectedPhase) {
                record('phase-advanced-before-frame')
                return
              }
              settled = true
              cleanup()
              publish({
                token: input.token,
                expectedPhase: input.expectedPhase,
                observedAtMs: timeline.find((entry) => entry.phase === input.expectedPhase)?.atMs ?? null,
                renderedFrameAtMs: frameTime - startedAt,
                renderedFramePhase: framePhase,
                timeline,
              })
            })
          }

          const observer = new MutationObserver(() => record('mutation'))
          observer.observe(element, { attributes: true, attributeFilter: ['data-life-map-phase'] })
          timer = window.setTimeout(() => {
            if (settled) return
            settled = true
            cleanup()
            publish({
              token: input.token,
              error: `data-life-map-phase=${input.expectedPhase} did not survive a rendered frame within ${input.timeout}ms; last=${lastPhase}`,
            })
          }, input.timeout)
          record('armed')
        }, { ...arg, token, bridgeName: BRIDGE_NAME })

        return witness
      }
    },
  })
}

function wrapPage(page) {
  const bridgeState = { waiters: new Map(), exposed: false }
  return new Proxy(page, {
    get(target, key) {
      if (key === 'locator') return (...args) => wrapLocator(target.locator(...args), target, bridgeState)
      if (key === '__uraiFounderInstallBridge') {
        return async () => {
          if (bridgeState.exposed) return
          await target.exposeFunction(BRIDGE_NAME, async (payload) => {
            const waiter = bridgeState.waiters.get(payload?.token)
            if (waiter) waiter(payload)
          })
          bridgeState.exposed = true
        }
      }
      return bindMember(target, key)
    },
  })
}

function wrapContext(context) {
  return new Proxy(context, {
    get(target, key) {
      if (key === 'newPage') {
        return async (...args) => {
          const page = wrapPage(await target.newPage(...args))
          await page.__uraiFounderInstallBridge()
          return page
        }
      }
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
