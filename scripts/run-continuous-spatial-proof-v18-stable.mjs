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

const deterministicMove = `async function moveToNearby(page, destination, method, timeout = 40_000) {
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
  const phaseTimeout = Math.max(timeout, 150_000)
  const lateralDirection = target.x < start.playerX ? 'left' : target.x > start.playerX ? 'right' : null
  const forwardDirection = target.z < start.playerZ ? 'forward' : target.z > start.playerZ ? 'back' : null
  const lateralTolerance = Math.min(1.35, target.radius * 0.6)
  const depthTolerance = Math.min(1.35, target.radius * 0.6)

  const setDirections = async (desired) => {
    if (method === 'keyboard') await setKeyboardDirections(page, active, desired)
    else await setTouchDirections(page, active, desired)
  }

  const waitForCoordinateOrNearby = async (axis, direction, targetValue, tolerance, label) => {
    const desired = new Set([direction])
    await setDirections(desired)
    const phaseStartedAt = Date.now()
    try {
      await page.waitForFunction(({ selector, destination, axis, direction, targetValue, tolerance }) => {
        const owner = document.querySelector(selector)
        if (!owner) return false
        if (owner.getAttribute('data-home-nearby') === destination) return true
        const attribute = axis === 'x' ? 'data-home-player-x' : 'data-home-player-z'
        const value = Number.parseFloat(owner.getAttribute(attribute) || '')
        if (!Number.isFinite(value)) return false
        return direction === 'left' || direction === 'forward'
          ? value <= targetValue + tolerance
          : value >= targetValue - tolerance
      }, { selector: ownerSelector, destination, axis, direction, targetValue, tolerance }, { timeout: phaseTimeout, polling: 100 })
    } finally {
      await releaseDirections(page, method, active)
    }
    await waitFrames(page, 3)
    const telemetry = await readMovementTelemetry(page, destination)
    samples.push(telemetry)
    phases.push({ label, axis, direction, targetValue, tolerance, elapsedMs: Date.now() - phaseStartedAt, telemetry })
    return telemetry
  }

  const waitForNearby = async (direction, label) => {
    const desired = new Set([direction])
    await setDirections(desired)
    const phaseStartedAt = Date.now()
    try {
      await page.waitForFunction(({ selector, destination }) => {
        const owner = document.querySelector(selector)
        return owner?.getAttribute('data-home-nearby') === destination
      }, { selector: ownerSelector, destination }, { timeout: phaseTimeout, polling: 100 })
    } finally {
      await releaseDirections(page, method, active)
    }
    await waitFrames(page, 3)
    const telemetry = await readMovementTelemetry(page, destination)
    samples.push(telemetry)
    phases.push({ label, direction, elapsedMs: Date.now() - phaseStartedAt, telemetry })
    return telemetry
  }

  const pulseTouchToNearby = async () => {
    const phaseStartedAt = Date.now()
    let pulses = 0
    while (Date.now() - phaseStartedAt < phaseTimeout) {
      const telemetry = await readMovementTelemetry(page, destination)
      samples.push(telemetry)
      if (telemetry.nearby === destination) {
        phases.push({ label: 'touch-pulse-arrival', pulses, elapsedMs: Date.now() - phaseStartedAt, telemetry })
        return telemetry
      }
      if (telemetry.playerX == null || telemetry.playerZ == null) break
      const dx = target.x - telemetry.playerX
      const dz = target.z - telemetry.playerZ
      let direction = null
      if (destination !== 'orb' && Math.abs(dx) > lateralTolerance) direction = dx < 0 ? 'left' : 'right'
      else if (Math.abs(dz) > depthTolerance) direction = dz < 0 ? 'forward' : 'back'
      else direction = Math.abs(dx) >= Math.abs(dz) ? (dx < 0 ? 'left' : 'right') : (dz < 0 ? 'forward' : 'back')
      await setDirections(new Set([direction]))
      await delay(250)
      await releaseDirections(page, method, active)
      await waitFrames(page, 1)
      pulses += 1
    }
    const telemetry = await readMovementTelemetry(page, destination)
    samples.push(telemetry)
    phases.push({ label: 'touch-pulse-timeout', pulses, elapsedMs: Date.now() - phaseStartedAt, telemetry })
    throw new Error(\`Home touch movement did not reach \${destination} with bounded corrective pulses\`)
  }

  try {
    if (method === 'touch') {
      await pulseTouchToNearby()
    } else {
      if (destination !== 'orb' && lateralDirection) {
        await waitForCoordinateOrNearby('x', lateralDirection, target.x, lateralTolerance, 'lateral-alignment')
      }
      const aligned = samples.at(-1)
      if (aligned.nearby !== destination) {
        if (!forwardDirection) throw new Error(\`Home proof had no forward axis available for \${destination}: \${JSON.stringify(aligned)}\`)
        await waitForNearby(forwardDirection, 'forward-arrival')
      }
    }
  } catch (error) {
    await releaseDirections(page, method, active).catch(() => {})
    const failed = await readMovementTelemetry(page, destination).catch(() => null)
    if (failed) samples.push(failed)
    error.evidence = {
      method,
      target: { destination, ...target },
      focus,
      start,
      end: failed,
      elapsedMs: Date.now() - startedAt,
      distanceTravelled: failed?.playerX != null && failed?.playerZ != null
        ? Math.hypot(failed.playerX - start.playerX, failed.playerZ - start.playerZ)
        : null,
      bestDistanceToTarget: samples.reduce((best, sample) => sample.distanceToTarget != null ? Math.min(best, sample.distanceToTarget) : best, Infinity),
      reached: failed?.nearby === destination,
      phases,
      samples,
    }
    throw error
  }

  await releaseDirections(page, method, active)
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
    distanceTravelled: Math.hypot(end.playerX - start.playerX, end.playerZ - start.playerZ),
    bestDistanceToTarget: samples.reduce((best, sample) => sample.distanceToTarget != null ? Math.min(best, sample.distanceToTarget) : best, Infinity),
    reached: end.nearby === destination,
    phases,
    samples,
  }
  if (!evidence.reached || evidence.distanceTravelled < 0.25 || end.distanceToTarget == null || end.distanceToTarget > target.radius) {
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

await writeFile(generatedUrl, stableSource, 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
