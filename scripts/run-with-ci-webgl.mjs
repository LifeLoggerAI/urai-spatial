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
    const inspect = () => {
      const root = document.querySelector(rootSelector)
      if (!(root instanceof HTMLElement)) return
      if (root.dataset.lifeMapMode !== 'selected') return

      let record = null
      try {
        record = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
      } catch {
        return
      }
      if (!record?.expectedPhase || record.observed) return
      if (root.dataset.lifeMapPhase !== record.expectedPhase) return

      const observed = {
        phase: root.dataset.lifeMapPhase,
        mode: root.dataset.lifeMapMode,
        scale: root.dataset.lifeMapScale || null,
        observedAt: performance.now(),
      }
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ ...record, observed }))
      } catch {
        // The checked-in Founder watcher remains authoritative if storage is unavailable.
      }
    }

    const observer = new MutationObserver(inspect)
    window.__uraiFounderJourneyPhaseLedgerObserver = observer
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
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
