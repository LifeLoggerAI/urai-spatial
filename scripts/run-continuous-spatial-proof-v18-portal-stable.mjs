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
    if (focus.afterEditable) throw new Error(\`Home portal proof could not clear editable focus before movement: \${JSON.stringify(focus)}\`)
    const start = await readMovementTelemetry(page, destination)
    if (start.playerX == null || start.playerZ == null || start.distanceToTarget == null) {
      throw new Error(\`Home portal steering telemetry was incomplete for \${destination}: \${JSON.stringify(start)}\`)
    }

    const phases = []
    const active = new Set()
    const startedAt = Date.now()

    async function steerAxis(axis) {
      const before = await readMovementTelemetry(page, destination)
      if (before.nearby === destination) return
      const current = axis === 'x' ? before.playerX : before.playerZ
      const desired = axis === 'x' ? target.x : target.z
      if (current == null) throw new Error(\`Home portal \${axis}-axis telemetry missing for \${destination}\`)
      if (Math.abs(desired - current) <= 0.45) return

      const direction = axis === 'x'
        ? (desired < current ? 'left' : 'right')
        : (desired < current ? 'forward' : 'back')
      await setKeyboardDirections(page, active, new Set([direction]))
      const phaseStartedAt = Date.now()
      try {
        await page.waitForFunction(({ selector, destination, axis, desired, direction }) => {
          const owner = document.querySelector(selector)
          if (!owner) return false
          if (owner.getAttribute('data-home-nearby') === destination) return true
          const attr = axis === 'x' ? 'data-home-player-x' : 'data-home-player-z'
          const value = Number.parseFloat(owner.getAttribute(attr) || '')
          if (!Number.isFinite(value)) return false
          return direction === 'left' || direction === 'forward'
            ? value <= desired + 0.45
            : value >= desired - 0.45
        }, { selector: ownerSelector, destination, axis, desired, direction }, { timeout: 45_000, polling: 100 })
      } finally {
        await releaseDirections(page, 'keyboard', active).catch(() => {})
      }
      const after = await readMovementTelemetry(page, destination)
      phases.push({
        label: \`portal-in-browser-\${axis}-steering\`,
        direction,
        elapsedMs: Date.now() - phaseStartedAt,
        before,
        after,
      })
    }

    await steerAxis('x')
    await steerAxis('z')

    let end = await readMovementTelemetry(page, destination)
    if (end.nearby !== destination) {
      const directions = desiredDirections(end, destination)
      const desired = new Set(directions)
      if (desired.size) {
        await setKeyboardDirections(page, active, desired)
        const phaseStartedAt = Date.now()
        try {
          await page.waitForFunction(({ selector, destination }) => {
            return document.querySelector(selector)?.getAttribute('data-home-nearby') === destination
          }, { selector: ownerSelector, destination }, { timeout: 30_000, polling: 100 })
        } finally {
          await releaseDirections(page, 'keyboard', active).catch(() => {})
        }
        end = await readMovementTelemetry(page, destination)
        phases.push({
          label: 'portal-in-browser-final-approach',
          directions,
          elapsedMs: Date.now() - phaseStartedAt,
          after: end,
        })
      }
    }

    const evidence = {
      method: 'keyboard',
      target: { destination, ...target },
      focus,
      start,
      end,
      elapsedMs: Date.now() - startedAt,
      distanceTravelled: start.playerX != null && start.playerZ != null && end.playerX != null && end.playerZ != null
        ? Math.hypot(end.playerX - start.playerX, end.playerZ - start.playerZ)
        : null,
      bestDistanceToTarget: end.distanceToTarget,
      reached: end.nearby === destination,
      phases,
      samples: [start, ...phases.map((phase) => phase.after).filter(Boolean), end],
    }

    if (!evidence.reached
      || evidence.distanceTravelled == null
      || evidence.distanceTravelled < 0.25
      || end.distanceToTarget == null
      || end.distanceToTarget > target.radius) {
      const error = new Error(\`Home portal bounded steering did not reach \${destination}: \${JSON.stringify(evidence)}\`)
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
