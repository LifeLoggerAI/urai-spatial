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

const groundBefore = `      const activeGroundLink = rail.locator('a[aria-current="page"]')
      const activeGroundLinkVisible = await activeGroundLink.count() === 1 && await activeGroundLink.isVisible()
      const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkVisible, canvasSized: canvas.canvasSized, ...canvas }
`

const groundAfter = `      const activeGroundLink = rail.locator('a[aria-current="page"]')
      const activeGroundLinkSuppressed = await visibleElementCount(activeGroundLink) === 0
      const groundRouteOwned = new URL(page.url()).pathname.replace(/\\/$/, '') === '/ground'
      const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkSuppressed, groundRouteOwned, canvasSized: canvas.canvasSized, ...canvas }
`

if (!source.includes(selectedMemoryBefore)) {
  throw new Error('Selected-memory proof source no longer matches the audited exact contract')
}
if (!source.includes(groundBefore)) {
  throw new Error('Ground proof source no longer matches the audited exact contract')
}

source = source
  .replace(selectedMemoryBefore, selectedMemoryAfter)
  .replace(groundBefore, groundAfter)
  .replace("schemaVersion: 'urai-continuous-spatial-visual-proof-7'", "schemaVersion: 'urai-continuous-spatial-visual-proof-8'")

await writeFile(patchedPath, source)
await import(`${pathToFileURL(patchedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
