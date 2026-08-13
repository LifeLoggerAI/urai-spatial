import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const CI_WEBGL_ARGS = [
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--disable-dev-shm-usage',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
]

function patchChromium(requireFrom, label) {
  try {
    const playwright = requireFrom('playwright')
    const chromium = playwright?.chromium
    if (!chromium || chromium.__uraiCiWebglPatched === true) return false
    const originalLaunch = chromium.launch.bind(chromium)
    Object.defineProperty(chromium, 'launch', {
      configurable: true,
      value(options = {}) {
        const requestedArgs = Array.isArray(options.args) ? options.args : []
        return originalLaunch({
          ...options,
          args: [...new Set([...requestedArgs, ...CI_WEBGL_ARGS])],
        })
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
