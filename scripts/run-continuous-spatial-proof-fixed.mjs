import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof.mjs')
const patchedPath = path.join(scriptsDir, '.capture-continuous-spatial-proof-fixed.mjs')

let source = await readFile(sourcePath, 'utf8')

function replaceRequired(label, pattern, replacement) {
  if (!pattern.test(source)) throw new Error(`${label} proof source no longer matches the audited contract`)
  source = source.replace(pattern, replacement)
}

const chooserAlreadyChecksSelectedState = source.includes("if (await page.getByRole('button', { name: 'Enter Focus' }).first().isVisible().catch(() => false)) return true")
if (!chooserAlreadyChecksSelectedState && !source.includes("const selectedControl = page.getByRole('button', { name: 'Enter Focus' }).first()")) {
  replaceRequired(
    'selected-memory chooser',
    /async function chooseVisibleLifeMapStar\(page\) \{\s*const canvas = page\.locator\('\[data-testid="urai-true-3d-life-map"\] canvas'\)\.first\(\)\s*const box = await canvas\.boundingBox\(\)\s*if \(!box\) return false/,
    `async function chooseVisibleLifeMapStar(page) {
  const selectedControl = page.getByRole('button', { name: 'Enter Focus' }).first()
  if (await selectedControl.isVisible().catch(() => false)) return true

  const canvas = page.locator('[data-testid="urai-true-3d-life-map"] canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 15_000 })
  const box = await canvas.boundingBox()
  if (!box) return false`,
  )
}

if (!source.includes('timeout: 2_500')) {
  replaceRequired(
    'canvas click timeout',
    /await canvas\.click\(\{\s*position: \{ x: Math\.round\(box\.width \* xRatio\), y: Math\.round\(box\.height \* yRatio\) \},\s*force: true,\s*\}\)/,
    `await canvas.click({
      position: { x: Math.round(box.width * xRatio), y: Math.round(box.height * yRatio) },
      force: true,
      timeout: 2_500,
    }).catch(() => {})`,
  )
}

replaceRequired(
  'active Home verifier',
  /const directDestinations = page\.getByRole\('navigation', \{ name: 'Direct Home destinations' \}\)\.getByRole\('button'\)[\s\S]*?const firstHomeFrameMarked = await page\.evaluate\(\(\) => performance\.getEntriesByName\('urai:first-home-spatial-frame'\)\.length > 0\)[\s\S]*?const canvas = await canvasEvidence\(page, '\[data-home-spatial-renderer="webgl"\] canvas'\)/,
  `const directDestinations = page.getByRole('navigation', { name: 'Direct Home destinations' }).getByRole('button')
      const directDestinationCount = await directDestinations.count()
      const visibleDirectDestinationCount = await visibleElementCount(directDestinations)
      const directDestinationsOwned = directDestinationCount === 3 && visibleDirectDestinationCount === 3
      const activeWorld = page.locator('.urai-final-home-world[data-home-spatial-renderer="webgl"]')
      await page.waitForFunction(() => document.querySelector('.urai-final-home-world[data-home-spatial-renderer="webgl"]')?.getAttribute('data-home-ready') === 'true', null, { timeout: 15_000 })
      const activeWorldReady = await activeWorld.getAttribute('data-home-ready') === 'true'
      const authoredSceneMounted = await activeWorld.getAttribute('data-home-visible-world') === 'final-physical-sanctuary-memory-rooms'
      const permanentFeatureShortcutsAbsent = await visibleElementCount(page.locator('.urai-home-spatial-runtime-portals a')) === 0
      const gateway = page.getByRole('button', { name: 'Open Ground directly' })
      const canonicalGroundGatewayVisible = await visibleElementCount(gateway) === 1
      const canonicalGroundGatewayInteractive = canonicalGroundGatewayVisible && await gateway.evaluate((node) => {
        const style = getComputedStyle(node)
        return !node.disabled && style.pointerEvents !== 'none'
      })
      const skyGateway = page.getByRole('button', { name: 'Open Life Map directly' })
      const canonicalSkyGatewayVisible = await visibleElementCount(skyGateway) === 1
      const canonicalSkyGatewayInteractive = canonicalSkyGatewayVisible && await skyGateway.evaluate((node) => {
        const style = getComputedStyle(node)
        return !node.disabled && style.pointerEvents !== 'none'
      })
      const mobileControlsContained = await page.evaluate(() => {
        if (window.innerWidth > 700) return true
        const pad = document.querySelector('.urai-mobile-movement')
        const nav = document.querySelector('.urai-home-runtime-doorways')
        if (!(pad instanceof HTMLElement) || !(nav instanceof HTMLElement)) return false
        const padRect = pad.getBoundingClientRect()
        const navRect = nav.getBoundingClientRect()
        const inside = (rect) => rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight
        const separated = padRect.right <= navRect.left - 8 || navRect.right <= padRect.left - 8 || padRect.bottom <= navRect.top - 8 || navRect.bottom <= padRect.top - 8
        return inside(padRect) && inside(navRect) && separated
      })
      const canvas = await canvasEvidence(page, '[data-home-spatial-renderer="webgl"] canvas')`,
)

replaceRequired(
  'active Home receipt',
  /return \{\s*runtimeMounted: runtime === 1,[\s\S]*?\.\.\.canvas,\s*\}/,
  `return {
        runtimeMounted: runtime === 1,
        oldWorldHidden,
        legacyControlsSuppressed: legacyControlsVisible === 0,
        activeWorldReady,
        mobileControlsContained,
        authoredSceneMounted,
        directDestinationsOwned,
        permanentFeatureShortcutsAbsent,
        canonicalGroundGatewayVisible,
        canonicalGroundGatewayInteractive,
        canonicalSkyGatewayVisible,
        canonicalSkyGatewayInteractive,
        canvasSized: canvas.canvasSized,
        directDestinationCount,
        visibleDirectDestinationCount,
        ...canvas,
      }`,
)

if (!source.includes('activeGroundLinkSuppressed')) {
  replaceRequired(
    'Ground verifier',
    /const activeGroundLink = rail\.locator\('a\[aria-current="page"\]'\)\s*const activeGroundLinkVisible = await activeGroundLink\.count\(\) === 1 && await activeGroundLink\.isVisible\(\)\s*const canvas = await canvasEvidence\(page, '\.ground-spatial-root canvas'\)\s*return \{ providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkVisible, canvasSized: canvas\.canvasSized, \.\.\.canvas \}/,
    `const activeGroundLink = rail.locator('a[aria-current="page"]')
      const activeGroundLinkSuppressed = await visibleElementCount(activeGroundLink) === 0
      const groundPath = new URL(page.url()).pathname
      const groundRouteOwned = (groundPath.endsWith('/') ? groundPath.slice(0, -1) : groundPath) === '/ground'
      const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkSuppressed, groundRouteOwned, canvasSized: canvas.canvasSized, ...canvas }`,
  )
}

if (!source.includes('unselectedActionControlsAbsent')) {
  replaceRequired(
    'Life Map unselected action ownership',
    /const spatialVisible = await page\.locator\('\[data-testid="urai-true-3d-life-map"\]'\)\.first\(\)\.getAttribute\('data-spatial-visible'\)\s*const canvas = await canvasEvidence\(page, '\[data-testid="urai-true-3d-life-map"\] canvas'\)\s*return \{/,
    `const spatialVisible = await page.locator('[data-testid="urai-true-3d-life-map"]').first().getAttribute('data-spatial-visible')
      const unselectedFocus = page.getByRole('button', { name: /^(Enter )?Focus$/ })
      const unselectedReplay = page.getByRole('button', { name: 'Replay', exact: true })
      const unselectedActionControlsAbsent = (
        await visibleElementCount(unselectedFocus) === 0
        && await visibleElementCount(unselectedReplay) === 0
      )
      const canvas = await canvasEvidence(page, '[data-testid="urai-true-3d-life-map"] canvas')
      return {`,
  )
  replaceRequired(
    'Life Map receipt ownership',
    /spatialDocumentVisible: spatialVisible === 'true',\s*canvasSized:/,
    `spatialDocumentVisible: spatialVisible === 'true',
        unselectedActionControlsAbsent,
        canvasSized:`,
  )
}

if (!source.includes('singleSelectedActionOwner')) {
  replaceRequired(
    'selected-memory controls',
    /const selectedControls = page\.getByRole\('button', \{ name: 'Enter Focus' \}\)\s*const selectedMemoryControlsVisible = await selectedControls\.count\(\) >= 1 && await selectedControls\.first\(\)\.isVisible\(\)\s*const replayControl = page\.getByRole\('button', \{ name: 'Replay' \}\)/,
    `const selectedControls = page.getByRole('button', { name: 'Enter Focus', exact: true })
      const replayControl = page.getByRole('button', { name: 'Replay', exact: true })
      const selectedMemoryControlsVisible = await visibleElementCount(selectedControls) === 1
      const replayControlVisible = await visibleElementCount(replayControl) === 1
      const singleSelectedActionOwner = selectedMemoryControlsVisible && replayControlVisible`,
  )
  replaceRequired(
    'selected-memory duplicate replay visibility',
    /const replayControlVisible = await replayControl\.count\(\) >= 1 && await replayControl\.first\(\)\.isVisible\(\)\s*const canvas/,
    `const canvas`,
  )
  replaceRequired(
    'selected-memory ownership receipt',
    /selectedMemoryControlsVisible,\s*replayControlVisible,/,
    `selectedMemoryControlsVisible,
        replayControlVisible,
        singleSelectedActionOwner,`,
  )
}

replaceRequired(
  'visual proof schema version',
  /schemaVersion: 'urai-continuous-spatial-visual-proof-[0-9]+'/,
  "schemaVersion: 'urai-continuous-spatial-visual-proof-14'",
)

const retiredHomeVerifierMarkersAbsent = !source.includes('sceneLabelRetired') && !source.includes('thresholdLabelsVisible')
if (!retiredHomeVerifierMarkersAbsent) {
  throw new Error('retired Home verifier markers remain in the exact-head visual proof source')
}

await writeFile(patchedPath, source)
await import(`${pathToFileURL(patchedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
