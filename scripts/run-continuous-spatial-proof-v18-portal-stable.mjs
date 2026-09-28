import { readFile, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const stableRunnerUrl = new URL('./run-continuous-spatial-proof-v18-stable.mjs', import.meta.url)

const original = await readFile(sourceUrl, 'utf8')
const portalStartMarker = 'async function capturePortalSequence(browser) {'
const portalEndMarker = '\nasync function captureFallback(browser) {'
const portalStart = original.indexOf(portalStartMarker)
const portalEnd = original.indexOf(portalEndMarker, portalStart)

if (portalStart < 0 || portalEnd < 0 || original.indexOf(portalStartMarker, portalStart + 1) >= 0) {
  throw new Error('Continuous visual proof portal contract changed; refusing an unbounded replacement')
}

const existingPortal = original.slice(portalStart, portalEnd)
for (const required of [
  "for (const destination of ['ground', 'life-map'])",
  "await moveToNearby(page, destination, 'keyboard')",
  "await page.keyboard.press('Enter')",
  "data-home-portal-sequence') === 'traversal'",
]) {
  if (!existingPortal.includes(required)) {
    throw new Error(`Continuous visual proof portal source no longer contains required contract: ${required}`)
  }
}

const repairedPortal = `async function capturePortalSequence(browser) {
  const spec = viewports[0]

  async function movePortalToNearby(page, destination) {
    const target = destinationTelemetry[destination]
    const focus = await clearEditableFocus(page)
    if (focus.afterEditable) throw new Error('Home portal proof could not clear editable focus before movement: ' + JSON.stringify(focus))
    const start = await readMovementTelemetry(page, destination)
    if (start.playerX == null || start.playerZ == null || start.distanceToTarget == null) {
      throw new Error('Home portal steering telemetry was incomplete for ' + destination + ': ' + JSON.stringify(start))
    }

    const active = new Set()
    const samples = [start]
    const phases = []
    const startedAt = Date.now()
    const movementBudgetMs = 40_000
    const pulseMs = 450
    let bestDistance = start.distanceToTarget
    let lastProgressAt = startedAt
    let reached = start.nearby === destination

    async function pulse(directions, label) {
      const before = await readMovementTelemetry(page, destination)
      if (before.nearby === destination) return { before, after: before }
      const desired = new Set(directions)
      if (!desired.size) return { before, after: before }
      await setKeyboardDirections(page, active, desired)
      const pulseStartedAt = Date.now()
      try {
        await delay(pulseMs)
      } finally {
        await releaseDirections(page, 'keyboard', active).catch(() => {})
      }
      await waitFrames(page, 2)
      const after = await readMovementTelemetry(page, destination)
      samples.push(after)
      phases.push({
        label,
        directions: [...desired],
        elapsedMs: Date.now() - pulseStartedAt,
        before,
        after,
      })
      return { before, after }
    }

    while (!reached && Date.now() - startedAt < movementBudgetMs) {
      const before = await readMovementTelemetry(page, destination)
      if (before.nearby === destination) {
        reached = true
        break
      }
      const directions = desiredDirections(before, destination)
      if (!directions.length) break

      let { after } = await pulse(directions, 'portal-adaptive-steering')
      if (after.nearby === destination) {
        reached = true
        break
      }

      if (after.distanceToTarget != null && after.distanceToTarget < bestDistance - 0.025) {
        bestDistance = after.distanceToTarget
        lastProgressAt = Date.now()
        continue
      }

      if (Date.now() - lastProgressAt >= 2_000) {
        const dx = target.x - (after.playerX ?? target.x)
        const dz = target.z - (after.playerZ ?? target.z)
        const correctiveDirection = Math.abs(dx) >= Math.abs(dz)
          ? (dx < 0 ? 'left' : 'right')
          : (dz < 0 ? 'forward' : 'back')
        ;({ after } = await pulse([correctiveDirection], 'portal-adaptive-corrective-axis'))
        if (after.nearby === destination) {
          reached = true
          break
        }
        if (after.distanceToTarget != null && after.distanceToTarget < bestDistance - 0.025) {
          bestDistance = after.distanceToTarget
          lastProgressAt = Date.now()
        }
      }

      if (Date.now() - lastProgressAt > 8_000) break
    }

    await releaseDirections(page, 'keyboard', active).catch(() => {})
    await waitFrames(page, 3)
    const end = await readMovementTelemetry(page, destination)
    samples.push(end)
    reached ||= end.nearby === destination
    if (end.distanceToTarget != null) bestDistance = Math.min(bestDistance, end.distanceToTarget)

    const evidence = {
      method: 'keyboard',
      target: { destination, ...target },
      focus,
      start,
      end,
      elapsedMs: Date.now() - startedAt,
      movementBudgetMs,
      pulseMs,
      distanceTravelled: start.playerX != null && start.playerZ != null && end.playerX != null && end.playerZ != null
        ? Math.hypot(end.playerX - start.playerX, end.playerZ - start.playerZ)
        : null,
      bestDistanceToTarget: Number.isFinite(bestDistance) ? bestDistance : null,
      reached,
      phases,
      samples,
    }

    if (!evidence.reached
      || evidence.distanceTravelled == null
      || evidence.distanceTravelled < 0.25
      || end.nearby !== destination
      || end.distanceToTarget == null
      || end.distanceToTarget > target.radius) {
      const error = new Error('Home portal adaptive steering did not reach ' + destination + ': ' + JSON.stringify(evidence))
      error.evidence = evidence
      throw error
    }
    return evidence
  }

  for (const destination of ['ground', 'life-map']) {
    const id = \`home-portal-\${destination}\`
    const { context, page } = await openContext(browser, spec)
    const diagnostics = attachDiagnostics(page, id)
    const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
    const expectedRoute = destination === 'ground'
      ? { pathname: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }
      : { pathname: '/life-map/', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' }
    const historyKey = \`urai-portal-proof:\${destination}\`
    let movement = null
    let activationFailure = null
    let routeEvidence = null
    let screenshot = null

    try {
      await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
      await waitForAssetHome(page)
      movement = await movePortalToNearby(page, destination)
      const focus = await clearEditableFocus(page)
      if (focus.afterEditable) throw new Error(\`Home portal proof retained editable focus before \${destination}: \${JSON.stringify(focus)}\`)

      await page.evaluate(({ selector, key }) => {
        const owner = document.querySelector(selector)
        if (!owner) throw new Error('Home portal proof owner is missing before activation')
        const write = (phase) => {
          const current = JSON.parse(sessionStorage.getItem(key) || '{"phases":[]}')
          if (phase && current.phases.at(-1)?.phase !== phase) current.phases.push({ phase, at: Date.now() })
          current.lastUrl = location.href
          sessionStorage.setItem(key, JSON.stringify(current))
        }
        sessionStorage.setItem(key, JSON.stringify({ phases: [], startedAt: Date.now(), lastUrl: location.href }))
        write(owner.getAttribute('data-home-portal-sequence'))
        const observer = new MutationObserver(() => write(owner.getAttribute('data-home-portal-sequence')))
        observer.observe(owner, { attributes: true, attributeFilter: ['data-home-portal-sequence'] })
        window.addEventListener('pagehide', () => {
          write(owner.getAttribute('data-home-portal-sequence'))
          observer.disconnect()
        }, { once: true })
      }, { selector: ownerSelector, key: historyKey })

      await page.keyboard.press('Enter')
      await page.waitForFunction(({ expected, key, destination }) => {
        const url = new URL(location.href)
        const history = JSON.parse(sessionStorage.getItem(key) || '{"phases":[]}')
        const routeSettled = url.pathname === expected.pathname
          && url.searchParams.get('entryPortal') === expected.entryPortal
          && url.searchParams.get('cameraCheckpoint') === expected.cameraCheckpoint
        const phaseNames = history.phases.map((entry) => String(entry.phase || ''))
        const openingIndex = phaseNames.indexOf(\`\${destination}:opening\`)
        const traversalIndex = phaseNames.indexOf(\`\${destination}:traversal\`)
        const closingIndex = phaseNames.indexOf(\`\${destination}:closing\`)
        const orderedLifecycle = openingIndex >= 0
          && traversalIndex > openingIndex
          && closingIndex > traversalIndex
        return routeSettled && orderedLifecycle
      }, { expected: expectedRoute, key: historyKey, destination }, { timeout: 90_000, polling: 100 })

      routeEvidence = await page.evaluate(({ expected, key, destination }) => {
        const url = new URL(location.href)
        const history = JSON.parse(sessionStorage.getItem(key) || '{"phases":[]}')
        const phaseNames = history.phases.map((entry) => String(entry.phase || ''))
        const openingIndex = phaseNames.indexOf(\`\${destination}:opening\`)
        const traversalIndex = phaseNames.indexOf(\`\${destination}:traversal\`)
        const closingIndex = phaseNames.indexOf(\`\${destination}:closing\`)
        const orderedLifecycle = openingIndex >= 0
          && traversalIndex > openingIndex
          && closingIndex > traversalIndex
        return {
          href: url.href,
          pathname: url.pathname,
          entryPortal: url.searchParams.get('entryPortal'),
          cameraCheckpoint: url.searchParams.get('cameraCheckpoint'),
          from: url.searchParams.get('from'),
          expected,
          routeSettled: url.pathname === expected.pathname
            && url.searchParams.get('entryPortal') === expected.entryPortal
            && url.searchParams.get('cameraCheckpoint') === expected.cameraCheckpoint,
          phases: history.phases,
          openingObserved: openingIndex >= 0,
          traversalObserved: traversalIndex >= 0,
          closingObserved: closingIndex >= 0,
          lifecycleObserved: orderedLifecycle,
        }
      }, { expected: expectedRoute, key: historyKey, destination })
    } catch (error) {
      activationFailure = { message: String(error), stack: error?.stack || null, evidence: error?.evidence || null }
      routeEvidence = await page.evaluate(({ key, destination }) => {
        const url = new URL(location.href)
        const phases = JSON.parse(sessionStorage.getItem(key) || '{"phases":[]}').phases
        const phaseNames = phases.map((entry) => String(entry.phase || ''))
        const openingIndex = phaseNames.indexOf(\`\${destination}:opening\`)
        const traversalIndex = phaseNames.indexOf(\`\${destination}:traversal\`)
        const closingIndex = phaseNames.indexOf(\`\${destination}:closing\`)
        return {
          href: url.href,
          pathname: url.pathname,
          entryPortal: url.searchParams.get('entryPortal'),
          cameraCheckpoint: url.searchParams.get('cameraCheckpoint'),
          from: url.searchParams.get('from'),
          phases,
          openingObserved: openingIndex >= 0,
          traversalObserved: traversalIndex >= 0,
          closingObserved: closingIndex >= 0,
          lifecycleObserved: openingIndex >= 0 && traversalIndex > openingIndex && closingIndex > traversalIndex,
        }
      }, { key: historyKey, destination }).catch(() => null)
    }

    screenshot = path.join(outputDir, \`\${id}-\${activationFailure ? 'failed' : 'settled'}-\${exactHead.slice(0, 12)}.png\`)
    await page.screenshot({ path: screenshot }).catch(() => {})
    const rawDiagnostics = diagnostics()
    const proofOrigin = new URL(base).origin
    const isBenignNavigationAbort = (request) => {
      if (!routeEvidence?.routeSettled || !String(request.failure || '').includes('ERR_ABORTED')) return false
      try {
        const requestUrl = new URL(request.url)
        return requestUrl.origin === proofOrigin
          && /^\/assets\/urai\/final\/manifests\/v[234]-asset-factory-spatial-handoff\.json$/.test(requestUrl.pathname)
      } catch {
        return false
      }
    }
    const ignoredAbortedRequests = rawDiagnostics.failedRequests.filter(isBenignNavigationAbort)
    const diagnosticResult = {
      ...rawDiagnostics,
      failedRequests: rawDiagnostics.failedRequests.filter((request) => !isBenignNavigationAbort(request)),
      ignoredAbortedRequests,
    }
    const video = await closeAndRecordVideo(context, page, id)
    const record = {
      id,
      destination,
      movement,
      activationFailure,
      routeEvidence,
      screenshot: path.relative(outputDir, screenshot),
      video,
      diagnostics: diagnosticResult,
    }
    receipt.interactions.push(record)
    const failed = Boolean(activationFailure)
      || !movement?.reached
      || movement?.end?.nearby !== destination
      || !routeEvidence?.routeSettled
      || !routeEvidence?.lifecycleObserved
      || diagnosticResult.pageErrors.length
      || diagnosticResult.consoleErrors.length
      || diagnosticResult.failedRequests.length
    if (failed) {
      receipt.errors.push(record)
      throw new Error(\`Home portal journey proof failed for \${id}: \${JSON.stringify(record)}\`)
    }
  }
}`

const patched = original.slice(0, portalStart) + repairedPortal + original.slice(portalEnd)
await writeFile(sourceUrl, patched, 'utf8')
try {
  await import(`${stableRunnerUrl.href}?portal=${Date.now()}`)
} finally {
  await writeFile(sourceUrl, original, 'utf8').catch(() => {})
}
