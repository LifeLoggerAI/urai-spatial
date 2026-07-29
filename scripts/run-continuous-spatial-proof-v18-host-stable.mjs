import { readFile, writeFile } from 'node:fs/promises'

const captureSourceUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const stableRunnerUrl = new URL('./run-continuous-spatial-proof-v18-stable.mjs', import.meta.url)
const portalRunnerUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)

const captureOriginal = await readFile(captureSourceUrl, 'utf8')
const stableOriginal = await readFile(stableRunnerUrl, 'utf8')
const portalOriginal = await readFile(portalRunnerUrl, 'utf8')

const hostClockWait = `async function waitForMovementFrame(page, timeout = 20_000) {
  const frameWait = page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => resolve('rendered-frame'))
  })).catch(() => 'page-closed')
  await Promise.race([frameWait, delay(timeout)])
}`

if (stableOriginal.split(hostClockWait).length - 1 !== 1) {
  throw new Error('Continuous proof host-clock frame-wait contract changed; refusing portal repair')
}
if (!stableOriginal.includes('const movementTimeout = Math.max(timeout, 300_000)')) {
  throw new Error('Continuous proof movement envelope changed; refusing portal repair')
}

const enabledFocusMarker = '  .replace(existingDriver, stableDriver)'
if (stableOriginal.split(enabledFocusMarker).length - 1 !== 1) {
  throw new Error('Continuous proof stable source transform changed; refusing enabled-focus repair')
}

const broadCanvasDisable = "await page.addInitScript(() => { Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null }) })"
const webglOnlyDisable = `await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.apply(this, [type, ...args])
    }
  })`
const legacyFallbackLocator = "const fallback = page.getByRole('region', { name: 'Spatial Home fallback' })"
const acceptedFallbackLocator = "const fallback = page.locator('[data-testid=\"urai-home-accessible-fallback\"][data-webgl-state=\"unavailable\"]')"
for (const [marker, label] of [
  [broadCanvasDisable, 'broad canvas disable'],
  [legacyFallbackLocator, 'legacy fallback locator'],
]) {
  if (captureOriginal.split(marker).length - 1 !== 1) {
    throw new Error(`Continuous proof ${label} contract changed; refusing no-WebGL repair`)
  }
}

const capturePatched = captureOriginal
  .replace(broadCanvasDisable, webglOnlyDisable)
  .replace(legacyFallbackLocator, acceptedFallbackLocator)

const stablePatched = stableOriginal.replace(enabledFocusMarker, `  .replace(existingDriver, stableDriver)
  .replace("const editableControl = page.locator('.home-discreet-controls button').first()", "const editableControl = page.locator('.home-discreet-controls button:not(:disabled)').first()")`)

const portalFrameWait = 'await waitFrames(page, 1)'
if (portalOriginal.split(portalFrameWait).length - 1 !== 2) {
  throw new Error('Portal corrective steering frame-wait contract changed; refusing host-clock repair')
}

// The portal runner embeds a regular-expression literal inside another template
// literal. Preserve two source backslashes here so the generated capture module
// receives one escaped slash/dot instead of the invalid /^/assets/.../ form.
const manifestRegexSource = String.raw`&& /^\/assets\/urai\/final\/manifests\/v[234]-asset-factory-spatial-handoff\.json$/.test(requestUrl.pathname)`
const escapedManifestRegexSource = String.raw`&& /^\\/assets\\/urai\\/final\\/manifests\\/v[234]-asset-factory-spatial-handoff\\.json$/.test(requestUrl.pathname)`
if (portalOriginal.split(manifestRegexSource).length - 1 !== 1) {
  throw new Error('Portal manifest-abort regex source changed; refusing nested escape repair')
}

const portalPatched = portalOriginal
  .replaceAll(portalFrameWait, 'await waitForMovementFrame(page)')
  .replace(manifestRegexSource, escapedManifestRegexSource)

await writeFile(captureSourceUrl, capturePatched, 'utf8')
await writeFile(stableRunnerUrl, stablePatched, 'utf8')
await writeFile(portalRunnerUrl, portalPatched, 'utf8')
try {
  await import(`${portalRunnerUrl.href}?hostClock=${Date.now()}`)
} finally {
  await writeFile(captureSourceUrl, captureOriginal, 'utf8').catch(() => {})
  await writeFile(stableRunnerUrl, stableOriginal, 'utf8').catch(() => {})
  await writeFile(portalRunnerUrl, portalOriginal, 'utf8').catch(() => {})
}
