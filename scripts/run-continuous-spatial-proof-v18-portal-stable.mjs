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
  for (const destination of ['ground', 'life-map']) {
    const id = \`home-portal-\${destination}\`
    const { context, page } = await openContext(browser, spec)
    const diagnostics = attachDiagnostics(page, id)
    const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
    const expectedRoute = destination === 'ground'
      ? { pathname: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }
      : { pathname: '/life-map/', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' }
    const historyKey = \`urai-portal-proof:\${destination}\`
    let movement = null
    let activationFailure = null
    let routeEvidence = null
    let screenshot = null

    try {
      await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
      await waitForAssetHome(page)
      movement = await moveToNearby(page, destination, 'keyboard')
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
        const traversalObserved = history.phases.some((entry) => String(entry.phase || '') === \`\${destination}:traversal\`)
        return routeSettled && traversalObserved
      }, { expected: expectedRoute, key: historyKey, destination }, { timeout: 90_000, polling: 100 })

      routeEvidence = await page.evaluate(({ expected, key }) => {
        const url = new URL(location.href)
        const history = JSON.parse(sessionStorage.getItem(key) || '{"phases":[]}')
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
          phaseObserved: history.phases.some((entry) => String(entry.phase || '').includes(':')),
          traversalObserved: history.phases.some((entry) => String(entry.phase || '').endsWith(':traversal')),
        }
      }, { expected: expectedRoute, key: historyKey })
    } catch (error) {
      activationFailure = { message: String(error), stack: error?.stack || null }
      routeEvidence = await page.evaluate(({ key }) => {
        const url = new URL(location.href)
        return {
          href: url.href,
          pathname: url.pathname,
          entryPortal: url.searchParams.get('entryPortal'),
          cameraCheckpoint: url.searchParams.get('cameraCheckpoint'),
          from: url.searchParams.get('from'),
          phases: JSON.parse(sessionStorage.getItem(key) || '{"phases":[]}').phases,
        }
      }, { key: historyKey }).catch(() => null)
    }

    screenshot = path.join(outputDir, \`\${id}-\${activationFailure ? 'failed' : 'settled'}-\${exactHead.slice(0, 12)}.png\`)
    await page.screenshot({ path: screenshot }).catch(() => {})
    const diagnosticResult = diagnostics()
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
      || !routeEvidence?.traversalObserved
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
