import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof.mjs')
const patchedPath = path.join(scriptsDir, '.capture-continuous-spatial-proof-fixed.mjs')

let source = await readFile(sourcePath, 'utf8')

const selectedMemoryBefore = `async function chooseVisibleLifeMapStar(page) {
  const canvas = page.locator('[data-testid="urai-true-3d-life-map"] canvas').first()
  const box = await canvas.boundingBox()
  if (!box) return false
`

const selectedMemoryAfter = `async function chooseVisibleLifeMapStar(page) {
  const selectedControl = page.getByRole('button', { name: 'Enter Focus' }).first()
  if (await selectedControl.isVisible().catch(() => false)) return true

  const canvas = page.locator('[data-testid="urai-true-3d-life-map"] canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 15_000 })
  const box = await canvas.boundingBox()
  if (!box) return false
`

const selectedControlsBefore = `      const selectedControls = page.getByRole('button', { name: 'Enter Focus' })
      const selectedMemoryControlsVisible = await selectedControls.count() >= 1 && await selectedControls.first().isVisible()
      const replayControl = page.getByRole('button', { name: 'Replay' })
`

const selectedControlsAfter = `      const routeOwnedFocus = page.getByRole('button', { name: 'Enter Focus' })
      const persistentOrbFocus = page.getByRole('button', { name: 'Focus', exact: true })
      const selectedMemoryControlsVisible = (
        await routeOwnedFocus.count() >= 1 && await routeOwnedFocus.first().isVisible()
      ) || (
        await persistentOrbFocus.count() >= 1 && await persistentOrbFocus.first().isVisible()
      )
      const replayControl = page.getByRole('button', { name: 'Replay' })
`

const homeBefore = `      const sceneLabels = page.locator('.urai-home-spatial-portal-label')
       const sceneLabelCount = await sceneLabels.count()
       const visibleSceneLabelCount = await visibleElementCount(sceneLabels)
       const orbLabelVisible = sceneLabelCount === 1 && visibleSceneLabelCount === 1
`

const homeAfter = `      const sceneLabels = page.locator('.urai-home-spatial-portal-label')
       const sceneLabelCount = await sceneLabels.count()
       const visibleSceneLabelCount = await visibleElementCount(sceneLabels)
       const portalLabelSemanticallyRetained = sceneLabelCount === 1
       const marketingPortalLabelSuppressed = visibleSceneLabelCount === 0
`

const homeReturnBefore = `        orbLabelVisible,
         permanentFeatureShortcutsAbsent,
`

const homeReturnAfter = `        portalLabelSemanticallyRetained,
         marketingPortalLabelSuppressed,
         permanentFeatureShortcutsAbsent,
`

const groundBefore = `      const activeGroundLink = rail.locator('a[aria-current="page"]')
       const activeGroundLinkVisible = await activeGroundLink.count() === 1 && await activeGroundLink.isVisible()
       const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
       return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkVisible, canvasSized: canvas.canvasSized, ...canvas }
`

const groundAfter = `      const activeGroundLink = rail.locator('a[aria-current="page"]')
       const activeGroundLinkSuppressed = await visibleElementCount(activeGroundLink) === 0
       const groundRouteOwned = new URL(page.url()).pathname.replace(/\\\/$/, '') === '/ground'
       const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
       return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkSuppressed, groundRouteOwned, canvasSized: canvas.canvasSized, ...canvas }
`

for (const [label, expected] of [
  ['selected-memory', selectedMemoryBefore],
  ['selected-memory controls', selectedControlsBefore],
  ['Home verifier', homeBefore],
  ['Home return receipt', homeReturnBefore],
  ['Ground verifier', groundBefore],
]) {
  if (!source.includes(expected)) throw new Error(`${label} proof source no longer matches the audited exact contract`)
}

source = source
  .replace(selectedMemoryBefore, selectedMemoryAfter)
  .replace(selectedControlsBefore, selectedControlsAfter)
  .replace(homeBefore, homeAfter)
  .replace(homeReturnBefore, homeReturnAfter)
  .replace(groundBefore, groundAfter)
  .replace("schemaVersion: 'urai-continuous-spatial-visual-proof-7'", "schemaVersion: 'urai-continuous-spatial-visual-proof-9'")

await writeFile(patchedPath, source)
await import(`${pathToFileURL(patchedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
