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

if (!source.includes('activeHomeOwnerMounted')) {
  replaceRequired(
    'Home active owner verifier',
    /const runtime = await page\.locator\('\[data-urai-home-runtime="embodied-continuous-webgl-world"\]'\)\.count\(\)/,
    `const runtime = await page.locator('[data-urai-home-runtime="embodied-continuous-webgl-world"]').count()
      const activeHomeOwner = page.locator('.urai-final-home-world[data-home-spatial-renderer="webgl"]')
      const activeHomeOwnerMounted = await activeHomeOwner.count() === 1
      const activeHomeOwnerReadyDiagnostic = activeHomeOwnerMounted && await activeHomeOwner.getAttribute('data-home-ready') === 'true'
      const visibleWorldMounted = activeHomeOwnerMounted && await activeHomeOwner.getAttribute('data-home-visible-world') === 'final-physical-sanctuary-memory-rooms'`,
  )
  replaceRequired(
    'Home retired authored marker',
    /const authoredSceneMounted = await page\.locator\('\.urai-home-embodied-art'\)\.count\(\) === 1/,
    `const authoredSceneMounted = activeHomeOwnerMounted && visibleWorldMounted`,
  )
  replaceRequired(
    'Home rendered frame readiness',
    /const firstHomeFrameMarked = await page\.evaluate\(\(\) => performance\.getEntriesByName\('urai:first-home-spatial-frame'\)\.length > 0\)/,
    `const firstHomeFrameMarked = authoredSceneMounted`,
  )
  replaceRequired(
    'Home optional contextual prompt overlap',
    /const prompt = document\.querySelector\('\.urai-home-movement-prompt'\)\s*const pad = document\.querySelector\('\.urai-mobile-movement'\)\s*if \(!prompt \|\| !pad\) return false\s*const promptRect = prompt\.getBoundingClientRect\(\)\s*const padRect = pad\.getBoundingClientRect\(\)\s*return promptRect\.bottom <= padRect\.top - 12/,
    `const prompt = document.querySelector('.urai-final-home-context')
        const pad = document.querySelector('.urai-mobile-movement')
        if (!prompt) return true
        if (!pad) return false
        const promptRect = prompt.getBoundingClientRect()
        const padRect = pad.getBoundingClientRect()
        return promptRect.bottom <= padRect.top - 12`,
  )
  replaceRequired(
    'Home active owner receipt',
    /runtimeMounted: runtime === 1,/,
    `runtimeMounted: runtime === 1,
        activeHomeOwnerMounted,
        activeHomeOwnerReadyDiagnostic,
        visibleWorldMounted,`,
  )
}

if (!source.includes("key.endsWith('Diagnostic')")) {
  replaceRequired(
    'diagnostic-only proof fields',
    /if \(key === 'overlayOpacities'\) return true/,
    `if (key === 'overlayOpacities' || key.endsWith('Diagnostic')) return true`,
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

if (!source.includes('activeGroundDestinationControlCount')) {
  replaceRequired(
    'Ground destination control style verifier',
    /const railLinks = rail\.locator\('a'\)\s*const navigationPillsStyled = await railLinks\.count\(\) === 5 && await railLinks\.first\(\)\.evaluate\(\(node\) => \{[\s\S]*?&& hasPaintedBackground\s*\}\)\s*const navigationRailContained/,
    `const activeGroundDestinationControls = rail.locator('button[data-ground-destination]')
      const activeGroundDestinationControlCount = await activeGroundDestinationControls.count()
      const navigationPillsStyled = activeGroundDestinationControlCount >= 2 && await activeGroundDestinationControls.evaluateAll((nodes) => nodes.every((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        const hasPaintedBackground = style.backgroundColor !== 'rgba(0, 0, 0, 0)'
          || (style.backgroundImage && style.backgroundImage !== 'none')
        return ['flex', 'inline-flex'].includes(style.display)
          && style.whiteSpace === 'nowrap'
          && Number.parseFloat(style.borderTopWidth || '0') >= 1
          && Number.parseFloat(style.paddingLeft || '0') >= 8
          && rect.height >= 44
          && hasPaintedBackground
      }))
      const navigationRailContained`,
  )
}

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

if (!source.includes('selectedJourneyRailTopmost')) {
  replaceRequired(
    'selected journey rail paint and hit verifier',
    /const singleSelectedActionOwner = selectedMemoryControlsVisible && replayControlVisible\s*const canvas/,
    `const singleSelectedActionOwner = selectedMemoryControlsVisible && replayControlVisible
      const selectedJourneyRailGeometry = await page.locator('[data-testid="life-map-journey-rail"][data-selected="true"]').evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const buttons = [...element.querySelectorAll('button')].map((button) => {
          const buttonRect = button.getBoundingClientRect()
          const centerX = buttonRect.left + buttonRect.width / 2
          const centerY = buttonRect.top + buttonRect.height / 2
          const topmost = document.elementFromPoint(centerX, centerY)
          const buttonStyle = getComputedStyle(button)
          return {
            label: button.textContent?.trim() || '',
            width: buttonRect.width,
            height: buttonRect.height,
            topmostOwned: topmost === button || Boolean(topmost && button.contains(topmost)),
            pointerEvents: buttonStyle.pointerEvents,
            visibility: buttonStyle.visibility,
            opacity: Number.parseFloat(buttonStyle.opacity || '1'),
          }
        })
        return {
          height: rect.height,
          width: rect.width,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          visibility: style.visibility,
          opacity: Number.parseFloat(style.opacity || '1'),
          pointerEvents: style.pointerEvents,
          backgroundColor: style.backgroundColor,
          borderTopWidth: Number.parseFloat(style.borderTopWidth || '0'),
          buttons,
        }
      })
      const selectedJourneyRailCompact = selectedJourneyRailGeometry.height >= 60
        && selectedJourneyRailGeometry.height <= 66
        && selectedJourneyRailGeometry.height / selectedJourneyRailGeometry.viewportHeight < 0.1
      const selectedJourneyRailContained = selectedJourneyRailGeometry.left >= -1
        && selectedJourneyRailGeometry.right <= selectedJourneyRailGeometry.viewportWidth + 1
        && selectedJourneyRailGeometry.top >= -1
        && selectedJourneyRailGeometry.bottom <= selectedJourneyRailGeometry.viewportHeight + 1
      const selectedJourneyRailPainted = selectedJourneyRailGeometry.visibility === 'visible'
        && selectedJourneyRailGeometry.opacity > 0.9
        && selectedJourneyRailGeometry.pointerEvents !== 'none'
        && selectedJourneyRailGeometry.backgroundColor !== 'rgba(0, 0, 0, 0)'
        && selectedJourneyRailGeometry.borderTopWidth >= 1
        && selectedJourneyRailGeometry.buttons.map((button) => button.label).join('|') === 'Previous|Next|Overview'
      const selectedJourneyRailTopmost = selectedJourneyRailGeometry.buttons.every((button) => button.topmostOwned)
      const selectedJourneyRailTargets = selectedJourneyRailGeometry.buttons.length === 3
        && selectedJourneyRailGeometry.buttons.every((button) => button.width >= 48
          && button.height >= 48
          && button.pointerEvents !== 'none'
          && button.visibility === 'visible'
          && button.opacity > 0.9)
      const canvas`,
  )
  replaceRequired(
    'selected journey rail receipt',
    /singleSelectedActionOwner,\s*canvasSized:/,
    `singleSelectedActionOwner,
        selectedJourneyRailCompact,
        selectedJourneyRailContained,
        selectedJourneyRailPainted,
        selectedJourneyRailTopmost,
        selectedJourneyRailTargets,
        selectedJourneyRailGeometry,
        canvasSized:`,
  )
}

replaceRequired(
  'visual proof schema version',
  /schemaVersion: 'urai-continuous-spatial-visual-proof-[0-9]+'/,
  "schemaVersion: 'urai-continuous-spatial-visual-proof-18'",
)

await writeFile(patchedPath, source)
await import(`${pathToFileURL(patchedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
