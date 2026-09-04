import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const CI_WEBGL_ARGS = [
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--disable-dev-shm-usage',
]

const FOUNDER_PHASE_STORAGE_KEY = '__uraiFounderJourneyPhaseWatchRecord'
const FOUNDER_ROOT_SELECTOR = '[data-testid="urai-true-3d-life-map"]'

async function installFounderPhaseLedger(context) {
  await context.addInitScript(({ rootSelector, storageKey }) => {
    const relevantAttributes = new Set(['data-life-map-phase', 'data-life-map-mode', 'data-life-map-scale'])

    const inspect = (candidate = null, historicalPhase = null) => {
      const root = candidate instanceof HTMLElement && candidate.matches(rootSelector)
        ? candidate
        : document.querySelector(rootSelector)
      if (!(root instanceof HTMLElement)) return
      if (root.dataset.lifeMapMode !== 'selected') return

      let record = null
      try {
        record = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
      } catch {
        return
      }
      if (!record?.expectedPhase || record.observed) return

      const observedPhase = historicalPhase === record.expectedPhase
        ? historicalPhase
        : root.dataset.lifeMapPhase === record.expectedPhase
          ? root.dataset.lifeMapPhase
          : null
      if (!observedPhase) return

      const observed = {
        phase: observedPhase,
        mode: 'selected',
        scale: root.dataset.lifeMapScale || null,
        observedAt: performance.now(),
        evidence: historicalPhase === observedPhase ? 'mutation-old-value' : 'current-dom',
      }
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ ...record, observed }))
      } catch {
        // The checked-in Founder watcher remains authoritative if storage is unavailable.
      }
    }

    // Software WebGL can monopolize the main thread long enough for a MutationObserver
    // callback to run after a short-lived production phase has already advanced. Keep
    // the normal current-DOM path, but also request attributeOldValue and consume the
    // browser's queued mutation history. If a later phase mutation reports that its old
    // value was the expected phase, that is direct evidence the real DOM previously held
    // that phase even when the callback itself was delayed. Production timers are not
    // extended, mocked, or replaced.
    const originalSetAttribute = Element.prototype.setAttribute
    Element.prototype.setAttribute = function patchedFounderPhaseAttribute(name, value) {
      const result = originalSetAttribute.call(this, name, value)
      if (relevantAttributes.has(String(name))) inspect(this)
      return result
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes'
          && mutation.attributeName === 'data-life-map-phase'
          && mutation.target instanceof HTMLElement
          && mutation.target.matches(rootSelector)
          && typeof mutation.oldValue === 'string'
        ) {
          inspect(mutation.target, mutation.oldValue)
        }
      }
      inspect()
    })
    window.__uraiFounderJourneyPhaseLedgerObserver = observer
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['data-life-map-phase', 'data-life-map-mode', 'data-life-map-scale'],
    })
    inspect()
  }, { rootSelector: FOUNDER_ROOT_SELECTOR, storageKey: FOUNDER_PHASE_STORAGE_KEY })
}

function patchBrowserContexts(browser, label) {
  if (!browser || browser.__uraiFounderPhaseLedgerPatched === true) return browser
  const originalNewContext = browser.newContext.bind(browser)
  Object.defineProperty(browser, 'newContext', {
    configurable: true,
    value: async (options = {}) => {
      const context = await originalNewContext(options)
      await installFounderPhaseLedger(context)
      return context
    },
  })
  Object.defineProperty(browser, '__uraiFounderPhaseLedgerPatched', {
    configurable: true,
    value: true,
  })
  console.log(`URAI_FOUNDER_PHASE_LEDGER_PATCHED ${label}`)
  return browser
}

function patchChromium(requireFrom, label) {
  try {
    const playwright = requireFrom('playwright')
    const chromium = playwright?.chromium
    if (!chromium || chromium.__uraiCiWebglPatched === true) return false
    const originalLaunch = chromium.launch.bind(chromium)
    Object.defineProperty(chromium, 'launch', {
      configurable: true,
      value: async (options = {}) => {
        const requestedArgs = Array.isArray(options.args) ? options.args : []
        const browser = await originalLaunch({
          ...options,
          args: [...new Set([...requestedArgs, ...CI_WEBGL_ARGS])],
        })
        return patchBrowserContexts(browser, label)
      },
    })
    Object.defineProperty(chromium, '__uraiCiWebglPatched', {
      configurable: true,
      value: true,
    })
    console.log(`URAI_CI_WEBGL_PATCHED ${label}`)
    return true
  } catch (error) {
    console.log(`URAI_CI_WEBGL_PATCH_SKIPPED ${label} ${String(error?.message || error)}`)
    return false
  }
}

const rootRequire = createRequire(new URL('../package.json', import.meta.url))
const tierOneRequire = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const patched = [
  patchChromium(rootRequire, 'root'),
  patchChromium(tierOneRequire, 'urai-tier1'),
].some(Boolean)

if (!patched) throw new Error('Unable to patch any Playwright Chromium instance for deterministic CI WebGL')

const target = process.argv[2]
if (!target) throw new Error('Usage: node scripts/run-with-ci-webgl.mjs <module> [args...]')
const targetPath = path.resolve(target)
process.argv = [process.argv[0], targetPath, ...process.argv.slice(3)]
await import(`${pathToFileURL(targetPath).href}?urai-ci-webgl=${Date.now()}`)
