import Module from 'node:module'
import path from 'node:path'

const originalLoad = Module._load
const BRIDGE_NAME = '__uraiFounderHarnessPhaseBridge'
const BRIDGE_START_NAME = '__uraiFounderHarnessPhaseStart'
const BRIDGE_ACTIVATION_NAME = '__uraiFounderHarnessActivationBridge'
const FOUNDER_ROOT_SELECTOR = '[data-testid="urai-true-3d-life-map"]'
const TIER_ONE_REQUIRE_PARENT_SUFFIX = path.join('urai-tier1', 'package.json')
const PREPARATION_TIMEOUT_MS = 300_000
let sequence = 0
let bridgedPlaywrightDelivered = false

function bindMember(target, key) {
  const value = Reflect.get(target, key, target)
  return typeof value === 'function' ? value.bind(target) : value
}

function isSemanticResultDescriptor(descriptor) {
  return descriptor.includes('[role="listitem"]') || descriptor.includes('data-life-map-semantic-result')
}

function markPendingStarted(bridgeState, token) {
  const pending = bridgeState.pendingWitness
  if (!pending || pending.token !== token || pending.started) return
  pending.started = true
  clearTimeout(pending.preparationTimeoutHandle)
  pending.phaseTimeoutHandle = setTimeout(() => {
    bridgeState.waiters.delete(pending.token)
    if (bridgeState.pendingWitness === pending) bridgeState.pendingWitness = null
    pending.reject(new Error(`data-life-map-phase=${pending.expectedPhase} did not reach the non-blocking bridge within ${pending.timeout}ms after semantic activation`))
  }, pending.timeout + 5_000)
}

async function preparePendingActivation(locator, page, bridgeState) {
  const pending = bridgeState.pendingWitness
  if (!pending || pending.started || pending.activationArmed) return
  if (bridgeState.armPromise) await bridgeState.armPromise
  await locator.evaluate((element, input) => {
    let fired = false
    const cleanup = () => {
      element.removeEventListener('pointerdown', onPointerDown, true)
      element.removeEventListener('click', onClick, true)
      element.removeEventListener('keydown', onKeyDown, true)
    }
    const start = () => {
      if (fired) return
      fired = true
      cleanup()
      const starter = window[input.startName]
      if (typeof starter !== 'function') throw new Error('Founder phase activation bridge is not installed')
      starter(input.token)
    }
    const onPointerDown = () => start()
    const onClick = () => start()
    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') start()
    }
    element.addEventListener('pointerdown', onPointerDown, true)
    element.addEventListener('click', onClick, true)
    element.addEventListener('keydown', onKeyDown, true)
  }, { token: pending.token, startName: BRIDGE_START_NAME })
  pending.activationArmed = true
}

function wrapLocator(locator, page, bridgeState, descriptor = '') {
  return new Proxy(locator, {
    get(target, key) {
      if (key === 'first') return () => wrapLocator(target.first(), page, bridgeState, descriptor)
      if (key === 'last') return () => wrapLocator(target.last(), page, bridgeState, descriptor)
      if (key === 'nth') return (index) => wrapLocator(target.nth(index), page, bridgeState, `${descriptor}:nth(${index})`)
      if (key === 'locator') return (...args) => wrapLocator(target.locator(...args), page, bridgeState, `${descriptor} locator:${String(args[0] ?? '')}`)
      if (key === 'filter') return (options) => wrapLocator(target.filter(options), page, bridgeState, `${descriptor} filter:${String(options?.hasText ?? '')}`)
      if (key === 'focus') {
        return async (...args) => {
          if (isSemanticResultDescriptor(descriptor)) await preparePendingActivation(target, page, bridgeState)
          const result = await target.focus(...args)
          if (isSemanticResultDescriptor(descriptor)) bridgeState.semanticResultFocused = true
          return result
        }
      }
      if (key === 'click' || key === 'tap') {
        return async (...args) => {
          if (bridgeState.armPromise) await bridgeState.armPromise
          if (isSemanticResultDescriptor(descriptor)) await preparePendingActivation(target, page, bridgeState)
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

        const token = `founder-phase-${++sequence}-${arg.expectedPhase}`
        let resolveWitness
        let rejectWitness
        const witness = new Promise((resolve, reject) => {
          resolveWitness = resolve
          rejectWitness = reject
        })
        const pending = {
          token,
          expectedPhase: arg.expectedPhase,
          timeout: arg.timeout,
          started: false,
          activationArmed: false,
          phaseTimeoutHandle: null,
          preparationTimeoutHandle: null,
          reject: rejectWitness,
        }
        pending.preparationTimeoutHandle = setTimeout(() => {
          bridgeState.waiters.delete(token)
          if (bridgeState.pendingWitness === pending) bridgeState.pendingWitness = null
          rejectWitness(new Error(`Founder semantic activation did not begin within ${PREPARATION_TIMEOUT_MS}ms while waiting for data-life-map-phase=${arg.expectedPhase}`))
        }, PREPARATION_TIMEOUT_MS)
        bridgeState.pendingWitness = pending
        bridgeState.semanticResultFocused = false
        bridgeState.waiters.set(token, (payload) => {
          clearTimeout(pending.preparationTimeoutHandle)
          clearTimeout(pending.phaseTimeoutHandle)
          bridgeState.waiters.delete(token)
          if (bridgeState.pendingWitness === pending) bridgeState.pendingWitness = null
          if (payload?.error) rejectWitness(new Error(payload.error))
          else resolveWitness(payload)
        })

        const armPromise = page.evaluate(({ selector, input }) => {
          const roots = document.querySelectorAll(selector)
          if (roots.length !== 1) {
            throw new Error(`Founder phase bridge expected exactly one canonical root; found ${roots.length}`)
          }
          let element = roots[0]
          let startedAt = null
          const timeline = []
          let lastPhase = null
          let settled = false
          let framePending = false
          let timer = 0

          const registry = window.__uraiFounderPhaseWitnessRegistry || new Map()
          window.__uraiFounderPhaseWitnessRegistry = registry
          window[input.startName] = (token) => {
            const starter = registry.get(token)
            if (typeof starter === 'function') starter()
          }

          const cleanup = () => {
            observer.disconnect()
            window.clearTimeout(timer)
            registry.delete(input.token)
          }
          const publish = (payload) => {
            Promise.resolve(window[input.bridgeName]?.(payload)).catch(() => {})
          }
          const currentRoot = () => {
            const current = document.querySelectorAll(selector)
            if (current.length !== 1) return null
            return current[0]
          }
          const readPhaseState = (root) => {
            const attributes = {
              source: 'data-life-map-source',
              phase: 'data-life-map-phase',
              mode: 'data-life-map-mode',
              scale: 'data-life-map-scale',
              renderReady: 'data-life-map-render-ready',
              objects: 'data-life-map-visible-objects',
              anchors: 'data-life-map-visible-anchors',
              calls: 'data-life-map-render-calls',
              triangles: 'data-life-map-render-triangles',
              webgl: 'data-webgl-state',
              privateMounted: 'data-private-memory-mounted',
              fallback: 'data-life-map-fallback',
            }
            return Object.fromEntries(Object.entries(attributes).map(([key, attribute]) => [key, root?.getAttribute(attribute) ?? null]))
          }
          const capturePhaseFrame = () => {
            const canvas = document.querySelector('canvas')
            if (!(canvas instanceof HTMLCanvasElement)) return null
            try {
              return canvas.toDataURL('image/png')
            } catch {
              return null
            }
          }
          const elapsed = () => startedAt === null ? null : performance.now() - startedAt
          const record = (source) => {
            const current = currentRoot()
            if (!current) return
            const rootChanged = current !== element
            element = current
            const phase = element.getAttribute('data-life-map-phase')
            if (phase !== lastPhase || rootChanged) {
              lastPhase = phase
              timeline.push({ phase, atMs: elapsed(), source: rootChanged ? `root-remount:${source}` : source })
            }
            if (startedAt === null || phase !== input.expectedPhase || framePending || settled) return
            framePending = true
            window.requestAnimationFrame((frameTime) => {
              framePending = false
              if (settled) return
              const frameRoot = currentRoot()
              const framePhase = frameRoot?.getAttribute('data-life-map-phase') ?? null
              if (framePhase !== input.expectedPhase) {
                record(frameRoot ? 'phase-advanced-before-frame' : 'root-missing-before-frame')
                return
              }
              element = frameRoot
              const phaseFrameDataUrl = capturePhaseFrame()
              const phaseState = readPhaseState(frameRoot)
              const phaseRoute = window.location.href
              const phaseViewport = { width: window.innerWidth, height: window.innerHeight }
              settled = true
              cleanup()
              publish({
                token: input.token,
                expectedPhase: input.expectedPhase,
                observedAtMs: timeline.find((entry) => entry.phase === input.expectedPhase && entry.atMs !== null)?.atMs ?? null,
                renderedFrameAtMs: frameTime - startedAt,
                renderedFramePhase: framePhase,
                timeline,
                phaseFrameDataUrl,
                phaseState,
                phaseRoute,
                phaseViewport,
              })
            })
          }
          const start = () => {
            if (startedAt !== null || settled) return
            startedAt = performance.now()
            Promise.resolve(window[input.activationName]?.(input.token)).catch(() => {})
            timer = window.setTimeout(() => {
              if (settled) return
              settled = true
              cleanup()
              publish({
                token: input.token,
                error: `data-life-map-phase=${input.expectedPhase} did not survive a rendered frame within ${input.timeout}ms after semantic activation; last=${lastPhase}`,
              })
            }, input.timeout)
            record('activation-start')
          }

          const observer = new MutationObserver(() => record('mutation'))
          observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['data-life-map-phase'],
          })
          registry.set(input.token, start)
          record('armed')
        }, { selector: FOUNDER_ROOT_SELECTOR, input: { ...arg, token, bridgeName: BRIDGE_NAME, startName: BRIDGE_START_NAME, activationName: BRIDGE_ACTIVATION_NAME } })

        bridgeState.armPromise = armPromise
        try {
          await armPromise
        } catch (error) {
          clearTimeout(pending.preparationTimeoutHandle)
          clearTimeout(pending.phaseTimeoutHandle)
          bridgeState.waiters.delete(token)
          if (bridgeState.pendingWitness === pending) bridgeState.pendingWitness = null
          rejectWitness(error)
          return witness
        } finally {
          if (bridgeState.armPromise === armPromise) bridgeState.armPromise = null
        }

        return witness
      }
    },
  })
}

function wrapKeyboard(keyboard, page, bridgeState) {
  return new Proxy(keyboard, {
    get(target, key) {
      if (key === 'press') {
        return async (pressed, ...args) => {
          const result = await target.press(pressed, ...args)
          if (String(pressed).toLowerCase() === 'enter') bridgeState.semanticResultFocused = false
          return result
        }
      }
      return bindMember(target, key)
    },
  })
}

function wrapPage(page) {
  const bridgeState = { waiters: new Map(), exposed: false, armPromise: null, pendingWitness: null, semanticResultFocused: false }
  return new Proxy(page, {
    get(target, key) {
      if (key === 'locator') return (...args) => wrapLocator(target.locator(...args), target, bridgeState, `locator:${String(args[0] ?? '')}`)
      if (key === 'getByRole') return (...args) => wrapLocator(target.getByRole(...args), target, bridgeState, `role:${String(args[0] ?? '')}:${String(args[1]?.name ?? '')}`)
      if (key === 'keyboard') return wrapKeyboard(target.keyboard, target, bridgeState)
      if (key === '__uraiFounderInstallBridge') {
        return async () => {
          if (bridgeState.exposed) return
          await target.exposeFunction(BRIDGE_NAME, async (payload) => {
            const waiter = bridgeState.waiters.get(payload?.token)
            if (waiter) waiter(payload)
          })
          await target.exposeFunction(BRIDGE_ACTIVATION_NAME, async (token) => {
            markPendingStarted(bridgeState, token)
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
