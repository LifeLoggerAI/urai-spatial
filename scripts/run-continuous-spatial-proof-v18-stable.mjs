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

const moveStartMarker = 'async function moveToNearby(page, destination, method, timeout = 40_000) {'
const moveEndMarker = '\nasync function resetHome(page) {'
const moveStart = original.indexOf(moveStartMarker)
const moveEnd = original.indexOf(moveEndMarker, moveStart)
if (moveStart < 0 || moveEnd < 0 || original.indexOf(moveStartMarker, moveStart + 1) >= 0) {
  throw new Error('Continuous visual proof movement contract changed; refusing an unbounded replacement')
}

const existingMove = original.slice(moveStart, moveEnd)
for (const required of [
  "const focus = method === 'keyboard' ? await clearEditableFocus(page)",
  'const start = await readMovementTelemetry(page, destination)',
  'if (telemetry.nearby === destination)',
  'await releaseDirections(page, method, active)',
  'Home ${method} movement did not reach ${destination}',
]) {
  if (!existingMove.includes(required)) {
    throw new Error(`Continuous visual proof movement source no longer contains required contract: ${required}`)
  }
}

const deterministicMove = `async function waitForMovementFrame(page, timeout = 500) {
  await page.evaluate((timeoutMs) => new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    requestAnimationFrame(finish)
    setTimeout(finish, timeoutMs)
  }), timeout)
}

async function moveToNearby(page, destination, method, timeout = 40_000) {
  const focus = method === 'keyboard' ? await clearEditableFocus(page) : { before: await describeFocus(page), blurred: false, after: await describeFocus(page), afterEditable: false }
  if (focus.afterEditable) throw new Error(\`Home proof could not clear editable focus before movement: \${JSON.stringify(focus)}\`)

  const target = destinationTelemetry[destination]
  const start = await readMovementTelemetry(page, destination)
  if (start.playerX == null || start.playerZ == null || start.distanceToTarget == null) {
    throw new Error(\`Home proof movement telemetry was incomplete before \${destination}: \${JSON.stringify(start)}\`)
  }

  const active = new Set()
  const samples = [start]
  const phases = []
  const startedAt = Date.now()
  const movementTimeout = Math.max(timeout, 150_000)
  const maxPulses = method === 'keyboard' ? 240 : 600
  const lateralTolerance = Math.min(1.1, target.radius * 0.45)
  const depthTolerance = Math.min(1.1, target.radius * 0.45)
  let reached = start.nearby === destination
  let pulse = 0

  const setDirections = async (desired) => {
    if (method === 'keyboard') await setKeyboardDirections(page, active, desired)
    else await setTouchDirections(page, active, desired)
  }

  try {
    while (!reached && Date.now() - startedAt < movementTimeout && pulse < maxPulses) {
      const before = await readMovementTelemetry(page, destination)
      samples.push(before)
      if (before.nearby === destination) {
        reached = true
        break
      }
      if (before.playerX == null || before.playerZ == null || before.distanceToTarget == null) {
        throw new Error(\`Home proof movement telemetry became incomplete for \${destination}: \${JSON.stringify(before)}\`)
      }

      const dx = target.x - before.playerX
      const dz = target.z - before.playerZ
      let direction = null
      if (destination !== 'orb' && Math.abs(dx) > lateralTolerance) {
        direction = dx < 0 ? 'left' : 'right'
      } else if (Math.abs(dz) > depthTolerance) {
        direction = dz < 0 ? 'forward' : 'back'
      } else {
        direction = Math.abs(dx) >= Math.abs(dz)
          ? (dx < 0 ? 'left' : 'right')
          : (dz < 0 ? 'forward' : 'back')
      }

      await setDirections(new Set([direction]))
      if (method === 'keyboard') await waitForMovementFrame(page)
      else await delay(250)
      await releaseDirections(page, method, active)
      await waitForMovementFrame(page)

      const after = await readMovementTelemetry(page, destination)
      samples.push(after)
      phases.push({
        label: 'bounded-telemetry-steering',
        pulse,
        direction,
        before,
        after,
      })
      reached = after.nearby === destination
      pulse += 1
    }
  } catch (error) {
    await releaseDirections(page, method, active).catch(() => {})
    const failed = await readMovementTelemetry(page, destination).catch(() => null)
    if (failed) samples.push(failed)
    const evidence = {
      method,
      target: { destination, ...target },
      focus,
      start,
      end: failed,
      elapsedMs: Date.now() - startedAt,
      distanceTravelled: failed?.playerX != null && failed?.playerZ != null
        ? Math.hypot(failed.playerX - start.playerX, failed.playerZ - start.playerZ)
        : null,
      bestDistanceToTarget: samples.reduce((best, sample) => sample?.distanceToTarget != null ? Math.min(best, sample.distanceToTarget) : best, Infinity),
      reached: failed?.nearby === destination,
      maxPulses,
      pulsesUsed: pulse,
      phases,
      samples,
    }
    error.evidence = evidence
    throw error
  } finally {
    await releaseDirections(page, method, active).catch(() => {})
  }

  await waitFrames(page, 3)
  const end = await readMovementTelemetry(page, destination)
  samples.push(end)
  const evidence = {
    method,
    target: { destination, ...target },
    focus,
    start,
    end,
    elapsedMs: Date.now() - startedAt,
    distanceTravelled: end.playerX != null && end.playerZ != null
      ? Math.hypot(end.playerX - start.playerX, end.playerZ - start.playerZ)
      : null,
    bestDistanceToTarget: samples.reduce((best, sample) => sample?.distanceToTarget != null ? Math.min(best, sample.distanceToTarget) : best, Infinity),
    reached: end.nearby === destination,
    maxPulses,
    pulsesUsed: pulse,
    phases,
    samples,
  }
  if (!evidence.reached
    || evidence.distanceTravelled == null
    || evidence.distanceTravelled < 0.25
    || end.distanceToTarget == null
    || end.distanceToTarget > target.radius) {
    const error = new Error(\`Home \${method} movement did not reach \${destination}: \${JSON.stringify(evidence)}\`)
    error.evidence = evidence
    throw error
  }
  return evidence
}`

if (!original.includes(existingDriver)) {
  throw new Error('Continuous visual proof keyboard contract changed; refusing an unbounded replacement')
}

const stableSource = (original.slice(0, moveStart) + deterministicMove + original.slice(moveEnd))
  .replace(existingDriver, stableDriver)
  .replaceAll('await page.screenshot({ path: screenshot, fullPage: false })', 'await page.screenshot({ path: screenshot, fullPage: false, timeout: 90_000 })')
  .replaceAll('await page.screenshot({ path: screenshot })', 'await page.screenshot({ path: screenshot, timeout: 90_000 })')

await writeFile(generatedUrl, stableSource, 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
