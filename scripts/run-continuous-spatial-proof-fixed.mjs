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

if (!source.includes("const selectedControl = page.getByRole('button', { name: 'Enter Focus' }).first()")) {
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

if (!source.includes('sceneLabelRetired') && !source.includes('thresholdLabelsVisible')) {
  replaceRequired(
    'Home verifier',
    /const sceneLabels = page\.locator\('\.urai-home-spatial-portal-label'\)\s*const sceneLabelCount = await sceneLabels\.count\(\)\s*const visibleSceneLabelCount = await visibleElementCount\(sceneLabels\)\s*const orbLabelVisible = sceneLabelCount === 1 && visibleSceneLabelCount === 1/,
    `const sceneLabels = page.locator('.urai-home-spatial-portal-label')
      const sceneLabelCount = await sceneLabels.count()
      const visibleSceneLabelCount = await visibleElementCount(sceneLabels)
      const sceneLabelRetired = sceneLabelCount === 0 && visibleSceneLabelCount === 0
      const marketingPortalLabelSuppressed = visibleSceneLabelCount === 0`,
  )
  replaceRequired(
    'Home verification receipt',
    /\s*orbLabelVisible,\s*permanentFeatureShortcutsAbsent,/,
    `
        sceneLabelRetired,
        marketingPortalLabelSuppressed,
        permanentFeatureShortcutsAbsent,`,
  )
}

if (!source.includes('activeGroundLinkSuppressed')) {
  replaceRequired(
    'Ground verifier',
    /const activeGroundLink = rail\.locator\('a\[aria-current="page"\]'\)\s*const activeGroundLinkVisible = await activeGroundLink\.count\(\) === 1 && await activeGroundLink\.isVisible\(\)\s*const canvas = await canvasEvidence\(page, '\.ground-spatial-root canvas'\)\s*return \{ providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkVisible, canvasSized: canvas\.canvasSized, \.\.\.canvas \}/,
    `const activeGroundLink = rail.locator('a[aria-current="page"]')
      const activeGroundLinkSuppressed = await visibleElementCount(activeGroundLink) === 0
      const groundRouteOwned = new URL(page.url()).pathname.replace(/\\\/$/, '') === '/ground'
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

if (!source.includes('authoredVisualSpineVisible')) {
  replaceRequired(
    'Life Map authored visual owner verifier',
    /const overlayOpacities = await page\.locator\('\[data-testid="urai-r3f-canonical-lifemap"\] > div\[aria-hidden="true"\]'\)\.evaluateAll\(\(nodes\) => nodes\.map\(\(node\) => Number\.parseFloat\(getComputedStyle\(node\)\.opacity \|\| '1'\)\)\)/,
    `const overlayOpacities = await page.locator('[data-testid="urai-r3f-canonical-lifemap"] > div[aria-hidden="true"]:not(.life-map-visual-spine)').evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity || '1')))
      const authoredVisualSpine = page.locator('[data-life-map-visual-owner="authored-deep-field"]').first()
      const authoredVisualSpineVisible = await authoredVisualSpine.count() === 1 && await authoredVisualSpine.evaluate((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number.parseFloat(style.opacity || '1') >= 0.8
          && style.backgroundImage !== 'none'
          && rect.width >= window.innerWidth * 0.9
          && rect.height >= window.innerHeight * 0.9
      })`,
  )
  replaceRequired(
    'Life Map authored visual owner receipt',
    /providerVeilSuppressed: overlayOpacities\.length === 0 \|\| overlayOpacities\.every\(\(opacity\) => opacity <= 0\.02\),/,
    `providerVeilSuppressed: overlayOpacities.length === 0 || overlayOpacities.every((opacity) => opacity <= 0.02),
        authoredVisualSpineVisible,`,
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

if (!source.includes('selectedCinematicSurfaceVisible')) {
  replaceRequired(
    'selected-memory cinematic visual proof',
    /const canvas = await canvasEvidence\(page, '\[data-testid="urai-true-3d-life-map"\] canvas'\)\s*return \{\s*firstSpatialFrameMarked,/,
    `const selectedCinematic = page.locator('[data-life-map-selected-visual="authored-memory-surface"]').first()
      const selectedCinematicSurfaceVisible = await selectedCinematic.count() === 1 && await selectedCinematic.evaluate((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number.parseFloat(style.opacity || '1') >= 0.8
          && rect.width >= Math.min(window.innerWidth * 0.42, 320)
          && rect.height >= Math.min(window.innerHeight * 0.28, 220)
      })
      const semanticDrawer = page.locator('.life-map-accessibility-menu').first()
      const semanticDrawerClosed = await semanticDrawer.count() === 1 && await semanticDrawer.evaluate((node) => !node.open)
      const canvas = await canvasEvidence(page, '[data-testid="urai-true-3d-life-map"] canvas')
      return {
        firstSpatialFrameMarked,
        selectedCinematicSurfaceVisible,
        semanticDrawerClosed,`,
  )
}

replaceRequired(
  'visual proof schema version',
  /schemaVersion: 'urai-continuous-spatial-visual-proof-[0-9]+'/,
  "schemaVersion: 'urai-continuous-spatial-visual-proof-13'",
)

await writeFile(patchedPath, source)
await import(`${pathToFileURL(patchedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
