import { spawnSync } from 'node:child_process'
import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const portalSourceUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)
const portalStableSourceUrl = new URL('./run-continuous-spatial-proof-v19-portal-stable.mjs', import.meta.url)
const portalStableGeneratedUrl = new URL('./.run-continuous-spatial-proof-v21-route-asset.generated.mjs', import.meta.url)
const original = await readFile(sourceUrl, 'utf8')
const portalSourceOriginal = await readFile(portalSourceUrl, 'utf8')
const portalStableOriginal = await readFile(portalStableSourceUrl, 'utf8')
const group = process.env.URAI_PROOF_GROUP || 'all'
const allowed = new Set(['visual', 'desktop', 'mobile', 'portal-fallback', 'all'])
if (!allowed.has(group)) throw new Error(`Unsupported URAI_PROOF_GROUP: ${group}`)

const routeAssetTarget = `          || (requestUrl.pathname === expectedRoute.pathname + 'index.txt' && requestUrl.searchParams.has('_rsc'))
          || (request.method === 'GET'
            && request.resourceType === 'document'`
const routeAssetReplacement = `          || (requestUrl.pathname === expectedRoute.pathname + 'index.txt' && requestUrl.searchParams.has('_rsc'))
          || (request.method === 'GET'
            && request.resourceType === 'image'
            && request.isNavigationRequest === false
            && requestUrl.pathname === (destination === 'ground'
              ? '/assets/urai/final/tier1/ground/ground-realm-desktop.svg'
              : '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg'))
          || (request.method === 'GET'
            && request.resourceType === 'document'`
const routeAssetCount = portalStableOriginal.split(routeAssetTarget).length - 1
if (routeAssetCount !== 1) throw new Error(`Portal destination asset abort predicate expected one audited occurrence; found ${routeAssetCount}`)
const portalStablePatched = portalStableOriginal.replace(routeAssetTarget, routeAssetReplacement)
for (const [label, marker] of [
  ['settled lifecycle guard', 'routeEvidence?.lifecycleObserved'],
  ['GET image guard', "request.resourceType === 'image'"],
  ['non-navigation image guard', 'request.isNavigationRequest === false'],
  ['Ground route asset', '/assets/urai/final/tier1/ground/ground-realm-desktop.svg'],
  ['Life Map route asset', '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg'],
  ['document navigation guard', "request.resourceType === 'document'"],
]) {
  if (!portalStablePatched.includes(marker)) throw new Error(`Portal route asset guard missing (${label}): ${marker}`)
}
if (!portalSourceOriginal.includes('requestUrl.origin === proofOrigin')) throw new Error('Portal route asset guard missing (same-origin guard): requestUrl.origin === proofOrigin')
await writeFile(portalStableGeneratedUrl, portalStablePatched, 'utf8')
const stableRunnerUrl = portalStableGeneratedUrl

const openTarget = `    recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } },`
const openReplacement = `    ...(process.env.URAI_PROOF_RECORD_VIDEO === 'true' ? { recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } } } : {}),`
if (original.split(openTarget).length - 1 !== 1) throw new Error('Video context contract changed')

const receiptTarget = `  expectReady,\n  captures: [],`
const receiptReplacement = `  expectReady,\n  group: ${JSON.stringify(group)},\n  captures: [],`
if (original.split(receiptTarget).length - 1 !== 1) throw new Error('Receipt contract changed')

const canvasRectTarget = `  const rect = await canvas.boundingBox()`
const canvasRectReplacement = `  const rect = await canvas.evaluate((element) => {\n    const bounds = element.getBoundingClientRect()\n    return { width: bounds.width, height: bounds.height }\n  })`
if (original.split(canvasRectTarget).length - 1 !== 1) throw new Error('Canvas measurement contract changed')

const loadingVisibilityTarget = `      const loadingVisible = [...document.querySelectorAll('.home-runtime-loading, .home-world-loading, .home-world-loading-canvas')]
        .some((node) => {
          const style = getComputedStyle(node)
          const rect = node.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
            && rect.width > 4 && rect.height > 4
        })`
const loadingVisibilityReplacement = `      const loadingVisible = [...document.querySelectorAll('.home-runtime-loading, .home-world-loading, .home-world-loading-canvas')]
        .some((node) => {
          const rect = node.getBoundingClientRect()
          if (rect.width <= 4 || rect.height <= 4) return false
          if (typeof node.checkVisibility === 'function') {
            return node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          }
          for (let current = node; current instanceof Element; current = current.parentElement) {
            const style = getComputedStyle(current)
            if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') <= 0.02) return false
          }
          return true
        })`
if (original.split(loadingVisibilityTarget).length - 1 !== 1) throw new Error('Loading visibility contract changed')

const discreetControlsTarget = `    discreetControls: await visibleCount(page.locator('.home-discreet-controls button')),`
const semanticOwnershipReplacement = `    semanticNavigationOwner: await semantic.getAttribute('data-home-navigation-owner'),\n    semanticNavigationNonDominant: await semantic.getAttribute('data-home-navigation-non-dominant'),\n    semanticNavigationOpacity: await semantic.evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity || '1')),`
if (original.split(discreetControlsTarget).length - 1 !== 1) throw new Error('Home semantic navigation measurement contract changed')

const discreetPassTarget = `    && result.semanticButtons === 3 && result.semanticVisible === 0 && result.discreetControls === 2`
const semanticPassReplacement = `    && result.semanticButtons === 3 && result.semanticVisible === 3\n    && result.semanticNavigationOwner === 'runtime-boundary' && result.semanticNavigationNonDominant === 'true'\n    && Number.isFinite(result.semanticNavigationOpacity) && result.semanticNavigationOpacity <= 0.02`
if (original.split(discreetPassTarget).length - 1 !== 1) throw new Error('Home semantic navigation pass contract changed')

const retiredModePassTarget = `    && result.assetMode === requiredMode && result.personalizationMode === expected.mode`
const retiredModePassReplacement = `    && result.assetMode === null && result.personalizationMode === null`
if (original.split(retiredModePassTarget).length - 1 !== 1) throw new Error('Home retired ownership marker pass contract changed')

const editableFocusTarget = `      const editableControl = page.locator('.home-discreet-controls button').first()`
const editableFocusReplacement = `      const editableControl = page.getByRole('navigation', { name: 'Accessible Home destinations' }).getByRole('button').first()`
if (original.split(editableFocusTarget).length - 1 !== 1) throw new Error('Home editable-focus regression contract changed')

const executionStart = `const browser = await chromium.launch({ headless: true })`
const originalExecutionIndex = original.indexOf(executionStart)
if (originalExecutionIndex < 0 || original.indexOf(executionStart, originalExecutionIndex + 1) >= 0) throw new Error('Execution contract changed')

const groupLiteral = JSON.stringify(group)
const execution = `const browser = await chromium.launch({ headless: true })
try {
  if (${groupLiteral} === 'visual' || ${groupLiteral} === 'all') {
    await captureHomeState(browser, viewports[0], { id: 'home-normal-root', route: '/', query: 'homePrivateFixture=1', mode: 'private-personalized', fixture: 'safe-private', orbState: 'idle' })
    await captureHomeState(browser, viewports[0], { id: 'home-normal-home', route: '/home/', query: 'homePrivateFixture=1', mode: 'private-personalized', fixture: 'safe-private', orbState: 'idle' })
    await captureLoading(browser, viewports[0])
    await captureOrbStates(browser)
  }
  if (${groupLiteral} === 'desktop' || ${groupLiteral} === 'all') {
    for (const destination of ['orb', 'ground', 'life-map']) await captureInteraction(browser, viewports[0], 'keyboard', destination)
    await capturePointerLook(browser)
  }
  if (${groupLiteral} === 'mobile' || ${groupLiteral} === 'all') {
    for (const spec of viewports.filter((value) => value.isMobile)) {
      for (const destination of ['orb', 'ground', 'life-map']) await captureInteraction(browser, spec, 'touch', destination)
    }
  }
  if (${groupLiteral} === 'portal-fallback' || ${groupLiteral} === 'all') {
    await capturePortalSequence(browser)
    await captureFallback(browser)
  }
} catch (error) {
  receipt.errors.push({ fatal: String(error), stack: error?.stack || null })
} finally {
  await browser.close()
}

await writeFile(path.join(outputDir, 'receipt.json'), \`${'${'}JSON.stringify(receipt, null, 2)}\\n\`)
console.log(JSON.stringify(receipt, null, 2))
if (receipt.errors.length) process.exit(1)`

const patchedPrefix = original
  .replace(openTarget, openReplacement)
  .replace(receiptTarget, receiptReplacement)
  .replace(canvasRectTarget, canvasRectReplacement)
  .replace(loadingVisibilityTarget, loadingVisibilityReplacement)
  .replace(discreetControlsTarget, semanticOwnershipReplacement)
  .replace(discreetPassTarget, semanticPassReplacement)
  .replace(retiredModePassTarget, retiredModePassReplacement)
  .replace(editableFocusTarget, editableFocusReplacement)
const patchedExecutionIndex = patchedPrefix.indexOf(executionStart)
if (patchedExecutionIndex < 0 || patchedPrefix.indexOf(executionStart, patchedExecutionIndex + 1) >= 0) throw new Error('Patched execution contract changed')
const grouped = patchedPrefix.slice(0, patchedExecutionIndex) + execution

const requiredSemanticGuards = [
  ['diagnostic failure guard', 'diagnosticResult.failedRequests.length'],
  ['fallback visibility guard', 'record.fallbackVisible'],
  ['fallback semantic destination count', 'record.semanticButtons !== 3'],
  ['interaction proof failure guard', 'Home interaction proof failed for'],
  ['direct canvas geometry measurement', 'element.getBoundingClientRect()'],
  ['ancestor-aware loading visibility', "node.checkVisibility"],
  ['semantic navigation owner', "semanticNavigationOwner === 'runtime-boundary'"],
  ['semantic navigation non-dominance', "semanticNavigationNonDominant === 'true'"],
  ['semantic navigation opacity', 'semanticNavigationOpacity <= 0.02'],
  ['retired asset mode absent', 'result.assetMode === null'],
  ['retired personalization mode absent', 'result.personalizationMode === null'],
  ['editable focus regression owner', "Accessible Home destinations"],
]
for (const [label, marker] of requiredSemanticGuards) {
  if (!grouped.includes(marker)) throw new Error(`Visual assertion missing after grouping (${label}): ${marker}`)
}
if (!grouped.includes('const browser = await chromium.launch({ headless: true })')) throw new Error('Grouped browser execution was not materialized')
if (grouped.includes('|| const browser = await chromium.launch')) throw new Error('Grouped execution splice corrupted the preceding assertion')
if (grouped.includes('\n  group,\n')) throw new Error('Grouped receipt retained an undefined shorthand group binding')
if (grouped.includes('.home-discreet-controls')) throw new Error('Grouped Home proof retained the retired discreet-controls contract')

await writeFile(sourceUrl, grouped, 'utf8')
try {
  const syntax = spawnSync(process.execPath, ['--check', sourceUrl.pathname], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`Grouped visual proof syntax check failed:\n${syntax.stderr || syntax.stdout}`)
  await import(`${stableRunnerUrl.href}?group=${encodeURIComponent(group)}&exact=${Date.now()}`)
} finally {
  await writeFile(sourceUrl, original, 'utf8').catch(() => {})
  await unlink(portalStableGeneratedUrl).catch(() => {})
}
