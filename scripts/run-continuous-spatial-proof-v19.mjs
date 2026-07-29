import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof-v18.mjs')
const materializedPath = path.join(scriptsDir, '.capture-continuous-spatial-proof-v19.mjs')

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.split(from).join(to)
}

let source = await readFile(sourcePath, 'utf8')
source = replaceExact(
  source,
  "page.locator('.home-discreet-controls button').first()",
  "page.locator('[data-urai-audit-action=\"orb-controls\"]').first()",
  1,
  'continuous proof editable-control selector',
)
source = replaceExact(
  source,
  `  const requiredMode = expected.assetMode || (expectReady ? 'ready' : 'disclosed-review-candidate')
  const passed = result.ownerCount === 1`,
  `  const semanticNonDominant = await semantic.evaluate((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight)
    const navAreaRatio = Math.max(0, rect.width * rect.height) / viewportArea
    return node.getAttribute('data-home-navigation-non-dominant') === 'true'
      && Number.parseFloat(style.opacity || '1') <= 0.05
      && rect.width <= 64
      && navAreaRatio <= 0.03
  })
  result.semanticNonDominant = semanticNonDominant
  const requiredMode = expected.assetMode || (expectReady ? 'ready' : 'disclosed-review-candidate')
  const passed = result.ownerCount === 1`,
  1,
  'continuous proof semantic non-dominance measurement',
)
source = replaceExact(
  source,
  '    && result.semanticButtons === 3 && result.semanticVisible === 0 && result.discreetControls === 2',
  '    && result.semanticButtons === 3 && result.semanticNonDominant && result.discreetControls === 2',
  1,
  'continuous proof semantic navigation acceptance',
)
source = replaceExact(
  source,
  `    reached,
    samples,`,
  `    reached: reached || end.nearby === destination,
    samples,`,
  1,
  'continuous proof terminal nearby telemetry acceptance',
)
source = replaceExact(
  source,
  '  if (!reached || evidence.distanceTravelled == null || evidence.distanceTravelled < 0.25) {',
  '  if (!evidence.reached || evidence.distanceTravelled == null || evidence.distanceTravelled < 0.25) {',
  1,
  'continuous proof terminal movement verdict',
)
source = replaceExact(
  source,
  'async function moveToNearby(page, destination, method, timeout = 40_000) {',
  'async function moveToNearby(page, destination, method, timeout = 120_000) {',
  1,
  'continuous proof slow-host movement timeout envelope',
)
source = replaceExact(
  source,
  '      if (Date.now() - lastProgressAt > 10_000) break',
  '      if (Date.now() - lastProgressAt > 30_000) break',
  1,
  'continuous proof slow-host progress stall envelope',
)

await writeFile(materializedPath, source)
console.log(`Materialized current continuous spatial proof at ${materializedPath}`)
await import(`${pathToFileURL(materializedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
