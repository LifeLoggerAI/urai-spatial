import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourcePath = path.resolve('scripts/capture-lifemap-founder-proof.mjs')
const generatedPath = path.resolve('scripts/.capture-lifemap-founder-proof-fixed.mjs')
let source = await readFile(sourcePath, 'utf8')

const original = `async function selectQuietReset(page) {
  const navigator = page.locator('[data-life-map-navigator]').first()
  await navigator.waitFor({ state: 'attached', timeout: 20_000 })
  await navigator.evaluate((details) => { details.open = true })
  const result = navigator.locator('[role="listitem"]').filter({ hasText: 'The Quiet Reset' }).first()
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await result.click()
  await navigator.evaluate((details) => { details.open = false })
  await waitForState(page, 'data-life-map-mode', 'selected')
}`

const replacement = `async function selectQuietReset(page) {
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

if (!source.includes(original)) throw new Error('Founder selection source drifted; semantic repair not applied')
source = source.replace(original, replacement)
await writeFile(generatedPath, source)
await import(generatedPath)
