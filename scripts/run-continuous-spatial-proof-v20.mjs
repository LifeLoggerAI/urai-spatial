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
  `      if (telemetry.nearby === destination) {
        reached = true
        break
      }`,
  `      if (telemetry.nearby === destination) {
        reached = true
        break
      }
      if (telemetry.distanceToTarget != null && telemetry.distanceToTarget < destinationTelemetry[destination].radius) {
        await releaseDirections(page, method, active)
        await page.waitForFunction(
          ({ selector, destination }) => document.querySelector(selector)?.getAttribute('data-home-nearby') === destination,
          { selector: ownerSelector, destination },
          { timeout: 15_000 },
        ).catch(() => {})
        const settled = await readMovementTelemetry(page, destination)
        samples.push(settled)
        if (settled.nearby === destination) {
          reached = true
          break
        }
      }`,
  1,
  'continuous proof destination-radius telemetry settlement',
)
await writeFile(sourcePath, source)
console.log(`Materialized destination-radius telemetry settlement at ${sourcePath}`)
await import('./run-continuous-spatial-proof-v19.mjs')
