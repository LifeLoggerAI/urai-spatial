import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof.mjs')
const patchedPath = path.join(scriptsDir, '.capture-continuous-spatial-proof-fixed.mjs')

let source = await readFile(sourcePath, 'utf8')

const replacements = [
  [
    `async function chooseVisibleLifeMapStar(page) {
  const canvas = page.locator('[data-testid="urai-true-3d-life-map"] canvas').first()
  const box = await canvas.boundingBox()
  if (!box) return false
`,
    `async function chooseVisibleLifeMapStar(page) {
  const selectedControl = page.getByRole('button', { name: 'Enter Focus' }).first()
  if (await selectedControl.isVisible().catch(() => false)) return true

  const canvas = page.locator('[data-testid="urai-true-3d-life-map"] canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 15_000 })
  const box = await canvas.boundingBox()
  if (!box) return false
`,
    'selected-memory proof',
  ],
  [
    `      const activeGroundLink = rail.locator('a[aria-current="page"]')
      const activeGroundLinkVisible = await activeGroundLink.count() === 1 && await activeGroundLink.isVisible()
      const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkVisible, canvasSized: canvas.canvasSized, ...canvas }
`,
    `      const activeGroundLink = rail.locator('a[aria-current="page"]')
      const activeGroundLinkSuppressed = await visibleElementCount(activeGroundLink) === 0
      const groundRouteOwned = new URL(page.url()).pathname.replace(/\\\/$/, '') === '/ground'
      const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkSuppressed, groundRouteOwned, canvasSized: canvas.canvasSized, ...canvas }
`,
    'Ground proof',
  ],
  [
    `      const runtime = await page.locator('[data-urai-home-runtime="one-continuous-webgl-world"]').count()`,
    `      const runtime = await page.locator('[data-urai-home-runtime="single-authoritative-sanctuary"]').count()`,
    'Home runtime ownership',
  ],
  [
    `      const sceneLabels = page.locator('.urai-home-spatial-portal-label')
      const sceneLabelCount = await sceneLabels.count()
      const visibleSceneLabelCount = await visibleElementCount(sceneLabels)
      const orbLabelVisible = sceneLabelCount === 1 && visibleSceneLabelCount === 1
`,
    `      const sceneLabels = page.locator('.urai-home-spatial-portal-label')
      const sceneLabelCount = await sceneLabels.count()
      const visibleSceneLabelCount = await visibleElementCount(sceneLabels)
      const semanticActions = page.getByLabel('URAI Home sanctuary actions')
      const semanticActionOwnerPresent = await semanticActions.count() === 1
      const visibleCompanionLauncherCount = await visibleElementCount(page.locator('.urai-world-companion__orb'))
      const singleVisibleOrbOwner = visibleCompanionLauncherCount === 0
`,
    'Home Orb ownership',
  ],
  [
    `        orbLabelVisible,`,
    `        semanticActionOwnerPresent,
        singleVisibleOrbOwner,
        visibleCompanionLauncherCount,`,
    'Home verification return',
  ],
  [
    `    ready: '.urai-home-spatial-world-final',`,
    `    ready: '.urai-home-fallback',`,
    'fallback ready selector',
  ],
  [
    `      const runtimeAbsent = await page.locator('.urai-home-spatial-runtime-layer').count() === 0
      const fallbackOwnerVisible = await visibleElementCount(page.locator('.urai-genesis-home__world')) > 0
      const fallbackActions = page.locator('.urai-genesis-home__threshold-gate--ground')
      const actionEvidence = await fallbackActions.evaluateAll((nodes) => nodes.map((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        const visible = style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number.parseFloat(style.opacity || '1') > 0.02
          && rect.width > 4
          && rect.height > 4
          && rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth
        return {
          visible,
          href: node.getAttribute('href'),
          interactive: style.pointerEvents !== 'none',
        }
      }))
      const fallbackActionVisible = actionEvidence.some((action) => action.visible)
      const fallbackInteractive = actionEvidence.some((action) => action.visible
        && action.href?.startsWith('/ground') === true
        && action.interactive)
      return { runtimeAbsent, fallbackOwnerVisible, fallbackActionVisible, fallbackInteractive }
`,
    `      const runtimePresent = await page.locator('[data-urai-home-runtime="single-authoritative-sanctuary"]').count() === 1
      const fallbackOwnerVisible = await visibleElementCount(page.locator('.urai-home-fallback')) === 1
      const legacyWorldSuppressed = await visibleElementCount(page.locator('.urai-genesis-home__world')) === 0
      const actionNames = ['Ascend to Life Map', 'Descend to Ground', 'Open Orb companion', 'Open embodied self']
      const actionEvidence = []
      for (const name of actionNames) {
        const action = page.getByRole('button', { name, exact: true })
        const count = await action.count()
        const interactive = count === 1 && await action.evaluate((node) => !node.disabled && getComputedStyle(node).pointerEvents !== 'none')
        actionEvidence.push({ name, count, interactive })
      }
      const fallbackActionsPresent = actionEvidence.every((action) => action.count === 1)
      const fallbackInteractive = actionEvidence.every((action) => action.interactive)
      return { runtimePresent, fallbackOwnerVisible, legacyWorldSuppressed, fallbackActionsPresent, fallbackInteractive }
`,
    'fallback ownership proof',
  ],
]

for (const [before, after, label] of replacements) {
  if (!source.includes(before)) throw new Error(`${label} source no longer matches the audited exact contract`)
  source = source.replace(before, after)
}

source = source.replace("schemaVersion: 'urai-continuous-spatial-visual-proof-7'", "schemaVersion: 'urai-continuous-spatial-visual-proof-9'")

await writeFile(patchedPath, source)
await import(`${pathToFileURL(patchedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
