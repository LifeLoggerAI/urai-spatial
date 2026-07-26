import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const generatedUrl = new URL('./.capture-continuous-spatial-proof-v18-stable.generated.mjs', import.meta.url)

const original = await readFile(sourceUrl, 'utf8')
const existingDriver = `async function setKeyboardDirections(page, active, desired) {
  for (const direction of [...active]) {
    if (desired.has(direction)) continue
    await page.keyboard.up(movementKeys[direction])
    active.delete(direction)
  }
  for (const direction of desired) {
    if (active.has(direction)) continue
    await page.keyboard.down(movementKeys[direction])
    active.add(direction)
  }
}`

const stableDriver = `async function setKeyboardDirections(page, active, desired) {
  for (const direction of [...active]) {
    if (desired.has(direction)) continue
    await page.keyboard.up(movementKeys[direction])
    active.delete(direction)
  }
  for (const direction of desired) {
    await page.keyboard.down(movementKeys[direction])
    active.add(direction)
  }
}`

const existingFinalTelemetry = `  await waitFrames(page, 3)
  const end = await readMovementTelemetry(page, destination)
  samples.push(end)
  const evidence = {`

const stableFinalTelemetry = `  await waitFrames(page, 3)
  const end = await readMovementTelemetry(page, destination)
  samples.push(end)
  const finalDistance = end.distanceToTarget
  if (finalDistance != null && finalDistance < bestDistance) bestDistance = finalDistance
  reached = reached || end.nearby === destination
    || (finalDistance != null && finalDistance <= destinationTelemetry[destination].radius)
  const evidence = {`

if (!original.includes(existingDriver) || !original.includes(existingFinalTelemetry)) {
  throw new Error('Continuous visual proof movement contract changed; refusing an unbounded patch')
}

const stableSource = original
  .replace(existingDriver, stableDriver)
  .replace(existingFinalTelemetry, stableFinalTelemetry)

await writeFile(generatedUrl, stableSource, 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
