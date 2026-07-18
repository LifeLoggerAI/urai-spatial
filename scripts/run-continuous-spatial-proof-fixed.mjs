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

if (!source.includes('sceneLabelRetired')) {
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

if (!source.includes('route.explicitDemo')) {
  replaceRequired(
    'selected-memory disclosed fixture route',
    /id: 'life-map-selected',\s*path: '\/life-map\/\?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',/,
    `id: 'life-map-selected',
    explicitDemo: true,
    path: '/life-map/?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1',`,
  )
  replaceRequired(
    'selected-memory disclosed fixture initialization',
    /try \{\s*const response = await page\.goto\(url, \{ waitUntil: 'domcontentloaded', timeout: 60_000 \}\)/,
    `try {
    if (route.explicitDemo) {
      await page.addInitScript(() => {
        window.localStorage.setItem('urai:lifeMapDemoMode', 'true')
        window.localStorage.removeItem('urai:userId')
      })
    }
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })`,
  )
}

replaceRequired(
  'visual proof schema version',
  /schemaVersion: 'urai-continuous-spatial-visual-proof-[0-9]+'/,
  "schemaVersion: 'urai-continuous-spatial-visual-proof-13'",
)

await writeFile(patchedPath, source)
await import(`${pathToFileURL(patchedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
