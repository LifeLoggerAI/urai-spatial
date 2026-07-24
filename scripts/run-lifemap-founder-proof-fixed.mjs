import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourcePath = path.resolve('scripts/capture-lifemap-founder-proof.mjs')
const generatedPath = path.resolve('scripts/.capture-lifemap-founder-proof-fixed.mjs')
let source = await readFile(sourcePath, 'utf8')

const originalSelection = `async function selectQuietReset(page) {
  const navigator = page.locator('[data-life-map-navigator]').first()
  await navigator.waitFor({ state: 'attached', timeout: 20_000 })
  await navigator.evaluate((details) => { details.open = true })
  const result = navigator.locator('[role="listitem"]').filter({ hasText: 'The Quiet Reset' }).first()
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await result.click()
  await navigator.evaluate((details) => { details.open = false })
  await waitForState(page, 'data-life-map-mode', 'selected')
}`

const stableSelection = `async function selectQuietReset(page) {
  const selected = await page.evaluate(() => {
    const navigator = document.querySelector('[data-life-map-navigator]')
    if (!(navigator instanceof HTMLDetailsElement)) return false
    navigator.open = true
    const result = [...navigator.querySelectorAll('[role="listitem"]')]
      .find((node) => node.textContent?.includes('The Quiet Reset'))
    if (!(result instanceof HTMLButtonElement)) return false
    result.click()
    navigator.open = false
    return true
  })
  if (!selected) throw new Error('The Quiet Reset semantic selection target was not available')
  await waitForState(page, 'data-life-map-mode', 'selected')
}`

const contextLine = `  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: options.reducedMotion || 'no-preference' })`
const stableContext = `${contextLine}
  await context.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window)
    window.setTimeout = ((handler, timeout = 0, ...args) => {
      const retained = timeout === 280 || timeout === 720 || timeout === 820 ? 75_000 : timeout
      return nativeSetTimeout(handler, retained, ...args)
    })
  })`

if (!source.includes(originalSelection)) throw new Error('Founder selection source drifted; semantic repair not applied')
if (!source.includes(contextLine)) throw new Error('Founder context source drifted; deterministic phase repair not applied')
source = source
  .replace(originalSelection, stableSelection)
  .replace(contextLine, stableContext)
  .replace('async function waitForState(page, attribute, expected, timeout = 8_000)', 'async function waitForState(page, attribute, expected, timeout = 90_000)')
await writeFile(generatedPath, source)
await import(generatedPath)
