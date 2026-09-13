import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const stableRunnerUrl = new URL('./run-continuous-spatial-proof-v18-stable.mjs', import.meta.url)

const captureOriginal = await readFile(captureUrl, 'utf8')
const groupedOriginal = await readFile(groupedUrl, 'utf8')

const oldOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const currentOwner = "(result.primaryOwner === 'asset-driven' && result.visibleWorld === 'moonlit-sacred-tech-sanctuary' && result.visualOwnership === 'three-dimensional-geometry' && result.movement === 'walk-keyboard-click-touch' && result.scenePhase === 'HOME' && result.inputLocked === 'false' && String(result.runtimeAssets || '').includes('home-entry-chamber-v1.glb') && String(result.runtimeAssets || '').includes('urai-orb-avatar-v1.glb') && String(result.runtimeAssets || '').includes('portal-ring-master-v1.glb'))"
if (captureOriginal.split(oldOwner).length - 1 !== 1) throw new Error('Continuous proof retired animation-owner contract changed')

const oldOrbClips = `const orbClips = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}`
const currentOrbClips = `const orbClips = {
  dormant: 'orb-rest', idle: 'orb-breathe', attention: 'orb-attention', listening: 'orb-listening',
  thinking: 'orb-thinking', speaking: 'orb-speaking', guiding: 'orb-guide', reflecting: 'orb-reflect',
  calming: 'orb-calm', privacy: 'orb-privacy', warning: 'orb-warning', transition: 'orb-transition',
}`
if (captureOriginal.split(oldOrbClips).length - 1 !== 1) throw new Error('Continuous proof Orb sensory contract changed')

const animationMeasurement = `    animationOwner: await owner.getAttribute('data-home-animation-owner'),`
const runtimeMeasurements = `    animationOwner: await owner.getAttribute('data-home-animation-owner'),
    primaryOwner: await owner.getAttribute('data-home-primary-owner'),
    visibleWorld: await owner.getAttribute('data-home-visible-world'),
    visualOwnership: await owner.getAttribute('data-home-visual-ownership'),
    movement: await owner.getAttribute('data-home-movement'),
    scenePhase: await owner.getAttribute('data-home-scene-phase'),
    inputLocked: await owner.getAttribute('data-home-input-locked'),
    runtimeAssets: await owner.getAttribute('data-home-runtime-assets'),`
if (captureOriginal.split(animationMeasurement).length - 1 !== 1) throw new Error('Continuous proof runtime ownership measurement contract changed')

const staleEnvironmentalRadius = 'radius: 2.2'
const runtimeEnvironmentalRadius = 'radius: 2.8'
const staleEnvironmentalCount = captureOriginal.split(staleEnvironmentalRadius).length - 1
if (staleEnvironmentalCount !== 2) {
  throw new Error(`Continuous proof environmental-threshold proximity contract changed: expected 2, found ${staleEnvironmentalCount}`)
}
const staleOrbRadius = "orb: { x: 0, z: -0.65, radius: 1.8"
const runtimeOrbRadius = "orb: { x: 0, z: -2.65, radius: 2.5"
const staleGroundTarget = "ground: { x: -4.55, z: -6.55"
const runtimeGroundTarget = "ground: { x: -5.2, z: -8.4"
const staleLifeMapTarget = "'life-map': { x: 4.55, z: -6.65"
const runtimeLifeMapTarget = "'life-map': { x: 5.2, z: -8.4"
if (captureOriginal.split(staleOrbRadius).length - 1 !== 1) throw new Error('Continuous proof Orb interaction-zone contract changed')
if (captureOriginal.split(staleGroundTarget).length - 1 !== 1) throw new Error('Continuous proof Ground target contract changed')
if (captureOriginal.split(staleLifeMapTarget).length - 1 !== 1) throw new Error('Continuous proof Life Map target contract changed')

const portalStartMarker = 'async function capturePortalSequence(browser) {'
const portalEndMarker = '\nasync function captureFallback(browser) {'
const portalStart = captureOriginal.indexOf(portalStartMarker)
const portalEnd = captureOriginal.indexOf(portalEndMarker, portalStart)
if (portalStart < 0 || portalEnd < 0 || captureOriginal.indexOf(portalStartMarker, portalStart + 1) >= 0) {
  throw new Error('Continuous proof portal function contract changed')
}
const retiredPortal = captureOriginal.slice(portalStart, portalEnd)
for (const marker of [
  "for (const destination of ['ground', 'life-map'])",
  "await page.keyboard.press('Enter')",
  "data-home-portal-sequence",
]) {
  if (!retiredPortal.includes(marker)) throw new Error(`Retired portal proof marker changed: ${marker}`)
}

const currentPortal = `async function capturePortalSequence(browser) {
  const spec = viewports[0]
  for (const destination of ['ground', 'life-map']) {
    const id = \`home-portal-\${destination}\`
    const { context, page } = await openContext(browser, spec)
    const diagnostics = attachDiagnostics(page, id)
    const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
    const expectedRoute = destination === 'ground'
      ? { pathname: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent', transitionPhase: 'GROUND' }
      : { pathname: '/life-map/', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete', transitionPhase: 'LIFE-MAP' }
    const historyKey = \`urai-current-portal-proof:\${destination}\`
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
        const read = () => ({
          at: Date.now(),
          scenePhase: owner.getAttribute('data-home-scene-phase'),
          inputLocked: owner.getAttribute('data-home-input-locked'),
          orbState: owner.getAttribute('data-home-orb-state'),
          nearby: owner.getAttribute('data-home-nearby'),
          url: location.href,
        })
        const write = () => {
          const current = JSON.parse(sessionStorage.getItem(key) || '{"samples":[]}')
          const sample = read()
          const previous = current.samples.at(-1)
          if (!previous || previous.scenePhase !== sample.scenePhase || previous.inputLocked !== sample.inputLocked || previous.orbState !== sample.orbState || previous.nearby !== sample.nearby) {
            current.samples.push(sample)
          }
          current.lastUrl = location.href
          sessionStorage.setItem(key, JSON.stringify(current))
        }
        sessionStorage.setItem(key, JSON.stringify({ samples: [], startedAt: Date.now(), lastUrl: location.href }))
        write()
        const observer = new MutationObserver(write)
        observer.observe(owner, { attributes: true, attributeFilter: ['data-home-scene-phase', 'data-home-input-locked', 'data-home-orb-state', 'data-home-nearby'] })
        window.addEventListener('pagehide', () => { write(); observer.disconnect() }, { once: true })
      }, { selector: ownerSelector, key: historyKey })

      await page.keyboard.press('Enter')
      await page.waitForFunction(({ expected }) => {
        const url = new URL(location.href)
        return url.pathname === expected.pathname
          && url.searchParams.get('entryPortal') === expected.entryPortal
          && url.searchParams.get('cameraCheckpoint') === expected.cameraCheckpoint
      }, { expected: expectedRoute }, { timeout: 90_000, polling: 100 })

      routeEvidence = await page.evaluate(({ expected, key }) => {
        const url = new URL(location.href)
        const history = JSON.parse(sessionStorage.getItem(key) || '{"samples":[]}')
        const transitionSamples = history.samples || []
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
          transitionSamples,
          transitionObserved: transitionSamples.some((sample) => sample.scenePhase === expected.transitionPhase),
          inputLockObserved: transitionSamples.some((sample) => sample.inputLocked === 'true'),
          orbTransitionObserved: transitionSamples.some((sample) => sample.orbState === 'transition'),
        }
      }, { expected: expectedRoute, key: historyKey })
    } catch (error) {
      activationFailure = { message: String(error), stack: error?.stack || null, evidence: error?.evidence || null }
      routeEvidence = await page.evaluate(({ expected, key }) => {
        const url = new URL(location.href)
        const history = JSON.parse(sessionStorage.getItem(key) || '{"samples":[]}')
        const transitionSamples = history.samples || []
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
          transitionSamples,
          transitionObserved: transitionSamples.some((sample) => sample.scenePhase === expected.transitionPhase),
          inputLockObserved: transitionSamples.some((sample) => sample.inputLocked === 'true'),
          orbTransitionObserved: transitionSamples.some((sample) => sample.orbState === 'transition'),
        }
      }, { expected: expectedRoute, key: historyKey }).catch(() => null)
    }

    screenshot = path.join(outputDir, \`\${id}-\${activationFailure ? 'failed' : 'settled'}-\${exactHead.slice(0, 12)}.png\`)
    await page.screenshot({ path: screenshot, timeout: 90_000 }).catch(() => {})
    const rawDiagnostics = diagnostics()
    const proofOrigin = new URL(base).origin
    const isBenignSettledAbort = (request) => {
      if (!routeEvidence?.routeSettled || !String(request.failure || '').includes('ERR_ABORTED')) return false
      try {
        const requestUrl = new URL(request.url)
        if (requestUrl.origin !== proofOrigin) return false
        return [
          '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
          '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
          '/assets/urai/final/manifests/v4-asset-factory-spatial-handoff.json',
          '/assets/urai/final/tier1/ground/ground-realm-desktop.svg',
          '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg',
        ].includes(requestUrl.pathname)
          || (requestUrl.pathname.startsWith('/_next/static/chunks/') && requestUrl.pathname.endsWith('.js'))
          || (requestUrl.pathname.startsWith('/_next/static/css/') && requestUrl.pathname.endsWith('.css'))
          || (requestUrl.pathname === expectedRoute.pathname + 'index.txt' && requestUrl.searchParams.has('_rsc'))
          || requestUrl.pathname === expectedRoute.pathname
      } catch {
        return false
      }
    }
    const ignoredAbortedRequests = rawDiagnostics.failedRequests.filter(isBenignSettledAbort)
    const diagnosticResult = {
      ...rawDiagnostics,
      failedRequests: rawDiagnostics.failedRequests.filter((request) => !isBenignSettledAbort(request)),
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
      || !routeEvidence?.transitionObserved
      || !routeEvidence?.inputLockObserved
      || !routeEvidence?.orbTransitionObserved
      || diagnosticResult.pageErrors.length
      || diagnosticResult.consoleErrors.length
      || diagnosticResult.failedRequests.length
    if (failed) {
      receipt.errors.push(record)
      throw new Error(\`Home current-runtime portal proof failed for \${id}: \${JSON.stringify(record)}\`)
    }
  }
}`

const groupedRunnerTarget = 'const stableRunnerUrl = portalStableGeneratedUrl'
const groupedRunnerReplacement = `const stableRunnerUrl = new URL('./run-continuous-spatial-proof-v18-stable.mjs', import.meta.url)`
if (groupedOriginal.split(groupedRunnerTarget).length - 1 !== 1) throw new Error('Grouped stable-runner contract changed')

const captureWithCurrentPortal = captureOriginal.slice(0, portalStart) + currentPortal + captureOriginal.slice(portalEnd)
const capturePatched = captureWithCurrentPortal
  .replace(oldOrbClips, currentOrbClips)
  .replace(animationMeasurement, runtimeMeasurements)
  .replace(oldOwner, currentOwner)
  .replaceAll(staleEnvironmentalRadius, runtimeEnvironmentalRadius)
  .replace(staleOrbRadius, runtimeOrbRadius)
  .replace(staleGroundTarget, runtimeGroundTarget)
  .replace(staleLifeMapTarget, runtimeLifeMapTarget)

for (const marker of [
  "result.primaryOwner === 'asset-driven'",
  "result.visibleWorld === 'moonlit-sacred-tech-sanctuary'",
  "result.visualOwnership === 'three-dimensional-geometry'",
  "result.scenePhase === 'HOME'",
  "orb-breathe",
  'transitionObserved',
  'inputLockObserved',
  'orbTransitionObserved',
  'Home current-runtime portal proof failed',
]) {
  if (!capturePatched.includes(marker)) throw new Error(`Current runtime proof marker missing: ${marker}`)
}
if (capturePatched.includes("result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'")) {
  throw new Error('Retired animation-owner assertion survived current-runtime proof materialization')
}

const groupedPatched = groupedOriginal.replace(groupedRunnerTarget, groupedRunnerReplacement)
if (!groupedPatched.includes('run-continuous-spatial-proof-v18-stable.mjs')) throw new Error('Current stable runner was not materialized')

await writeFile(captureUrl, capturePatched, 'utf8')
await writeFile(groupedUrl, groupedPatched, 'utf8')
try {
  await import(`${groupedUrl.href}?currentSacredRuntime=${Date.now()}`)
} finally {
  await writeFile(captureUrl, captureOriginal, 'utf8').catch(() => {})
  await writeFile(groupedUrl, groupedOriginal, 'utf8').catch(() => {})
}
