import { spawnSync } from 'node:child_process'
import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const portalStableSourceUrl = new URL('./run-continuous-spatial-proof-v19-portal-stable.mjs', import.meta.url)
const portalStableGeneratedUrl = new URL('./.run-continuous-spatial-proof-v21-route-asset.generated.mjs', import.meta.url)
const original = await readFile(sourceUrl, 'utf8')
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
if (routeAssetCount !== 1) {
  throw new Error(`Portal destination asset abort predicate expected one audited occurrence; found ${routeAssetCount}`)
}
const portalStablePatched = portalStableOriginal.replace(routeAssetTarget, routeAssetReplacement)
for (const [label, marker] of [
  ['settled lifecycle guard', 'routeEvidence?.lifecycleObserved'],
  ['same-origin guard', 'requestUrl.origin === proofOrigin'],
  ['GET image guard', "request.resourceType === 'image'"],
  ['non-navigation image guard', 'request.isNavigationRequest === false'],
  ['Ground route asset', '/assets/urai/final/tier1/ground/ground-realm-desktop.svg'],
  ['Life Map route asset', '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg'],
  ['document navigation guard', "request.resourceType === 'document'"],
]) {
  if (!portalStablePatched.includes(marker)) throw new Error(`Portal route asset guard missing (${label}): ${marker}`)
}
await writeFile(portalStableGeneratedUrl, portalStablePatched, 'utf8')
const stableRunnerUrl = portalStableGeneratedUrl

const openTarget = `    recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } },`
const openReplacement = `    ...(process.env.URAI_PROOF_RECORD_VIDEO === 'true' ? { recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } } } : {}),`
if (original.split(openTarget).length - 1 !== 1) throw new Error('Video context contract changed')

const receiptTarget = `  expectReady,\n  captures: [],`
const receiptReplacement = `  expectReady,\n  group: ${JSON.stringify(group)},\n  captures: [],`
if (original.split(receiptTarget).length - 1 !== 1) throw new Error('Receipt contract changed')

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
const patchedExecutionIndex = patchedPrefix.indexOf(executionStart)
if (patchedExecutionIndex < 0 || patchedPrefix.indexOf(executionStart, patchedExecutionIndex + 1) >= 0) {
  throw new Error('Patched execution contract changed')
}
const grouped = patchedPrefix.slice(0, patchedExecutionIndex) + execution

const requiredSemanticGuards = [
  ['diagnostic failure guard', 'diagnosticResult.failedRequests.length'],
  ['fallback visibility guard', 'record.fallbackVisible'],
  ['fallback semantic destination count', 'record.semanticButtons !== 3'],
  ['interaction proof failure guard', 'Home interaction proof failed for'],
]
for (const [label, marker] of requiredSemanticGuards) {
  if (!grouped.includes(marker)) throw new Error(`Visual assertion missing after grouping (${label}): ${marker}`)
}
if (!grouped.includes('const browser = await chromium.launch({ headless: true })')) {
  throw new Error('Grouped browser execution was not materialized')
}
if (grouped.includes('|| const browser = await chromium.launch')) {
  throw new Error('Grouped execution splice corrupted the preceding assertion')
}
if (grouped.includes('\n  group,\n')) {
  throw new Error('Grouped receipt retained an undefined shorthand group binding')
}

await writeFile(sourceUrl, grouped, 'utf8')
try {
  const syntax = spawnSync(process.execPath, ['--check', sourceUrl.pathname], { encoding: 'utf8' })
  if (syntax.status !== 0) {
    throw new Error(`Grouped visual proof syntax check failed:\n${syntax.stderr || syntax.stdout}`)
  }
  await import(`${stableRunnerUrl.href}?group=${encodeURIComponent(group)}&exact=${Date.now()}`)
} finally {
  await writeFile(sourceUrl, original, 'utf8').catch(() => {})
  await unlink(portalStableGeneratedUrl).catch(() => {})
}
