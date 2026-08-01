import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof-v18.mjs')

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.split(from).join(to)
}

let source = await readFile(sourcePath, 'utf8')
source = replaceExact(
  source,
  `  const startedAt = Date.now()
  let bestDistance = start.distanceToTarget ?? Infinity`,
  `  const startedAt = Date.now()
  if (method === 'touch') {
    await page.evaluate(({ selector, destination, buttonNames, pointerIds }) => {
      const owner = document.querySelector(selector)
      if (!owner) return
      window.__uraiProofTouchAutoRelease?.disconnect?.()
      const releaseTouchDirections = () => {
        for (const [direction, label] of Object.entries(buttonNames)) {
          const button = [...document.querySelectorAll('button')]
            .find((node) => node.getAttribute('aria-label') === label)
          if (!button) continue
          button.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: pointerIds[direction],
            pointerType: 'touch',
            button: 0,
          }))
        }
      }
      const observer = new MutationObserver(() => {
        if (owner.getAttribute('data-home-nearby') === destination) releaseTouchDirections()
      })
      observer.observe(owner, { attributes: true, attributeFilter: ['data-home-nearby'] })
      window.__uraiProofTouchAutoRelease = observer
      if (owner.getAttribute('data-home-nearby') === destination) releaseTouchDirections()
    }, {
      selector: ownerSelector,
      destination,
      buttonNames: movementButtonNames,
      pointerIds: movementPointerIds,
    })
  }
  let bestDistance = start.distanceToTarget ?? Infinity`,
  1,
  'continuous proof touch destination auto-release observer',
)
source = replaceExact(
  source,
  `      if (telemetry.nearby === destination) {
        reached = true
        break
      }`,
  `      if (telemetry.nearby === destination) {
        await releaseDirections(page, method, active)
        await page.waitForFunction(
          (selector) => document.querySelector(selector)?.getAttribute('data-home-moving') === 'false',
          ownerSelector,
          { timeout: 5_000 },
        ).catch(() => {})
        const settled = await readMovementTelemetry(page, destination)
        samples.push(settled)
        if (
          settled.nearby === destination
          && settled.moving === 'false'
          && settled.distanceToTarget != null
          && settled.distanceToTarget <= destinationTelemetry[destination].radius
        ) {
          reached = true
          break
        }
      }
      if (telemetry.distanceToTarget != null && telemetry.distanceToTarget < destinationTelemetry[destination].radius) {
        await releaseDirections(page, method, active)
        await page.waitForFunction(
          (selector) => document.querySelector(selector)?.getAttribute('data-home-moving') === 'false',
          ownerSelector,
          { timeout: 5_000 },
        ).catch(() => {})
        const settled = await readMovementTelemetry(page, destination)
        samples.push(settled)
        if (
          settled.nearby === destination
          && settled.moving === 'false'
          && settled.distanceToTarget != null
          && settled.distanceToTarget <= destinationTelemetry[destination].radius
        ) {
          reached = true
          break
        }
      }`,
  1,
  'continuous proof released stable destination telemetry acceptance',
)
source = replaceExact(
  source,
  'const browser = await chromium.launch({ headless: true })',
  'let browser = await chromium.launch({ headless: true })',
  1,
  'continuous proof recyclable browser owner',
)
source = replaceExact(
  source,
  `  await capturePointerLook(browser)
  await capturePortalSequence(browser)
  await captureFallback(browser)`,
  `  await capturePointerLook(browser)
  await capturePortalSequence(browser)
  await browser.close()
  browser = await chromium.launch({ headless: true })
  await captureFallback(browser)`,
  1,
  'continuous proof isolated fallback browser boundary',
)
await writeFile(sourcePath, source)
console.log(`Materialized released stable destination telemetry acceptance and isolated fallback capture at ${sourcePath}`)
await import('./run-continuous-spatial-proof-v19.mjs')
