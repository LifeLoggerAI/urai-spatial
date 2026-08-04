import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const generatedUrl = new URL('./.capture-continuous-spatial-proof-v21-grouped.generated.mjs', import.meta.url)
const original = await readFile(sourceUrl, 'utf8')
const group = process.env.URAI_PROOF_GROUP || 'all'
const allowed = new Set(['visual', 'desktop', 'mobile', 'portal-fallback', 'all'])
if (!allowed.has(group)) throw new Error(`Unsupported URAI_PROOF_GROUP: ${group}`)

const openTarget = `    recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } },`
const openReplacement = `    ...(process.env.URAI_PROOF_RECORD_VIDEO === 'true' ? { recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } } } : {}),`
if (original.split(openTarget).length - 1 !== 1) throw new Error('Video context contract changed')

const receiptTarget = `  expectReady,\n  captures: [],`
const receiptReplacement = `  expectReady,\n  group,\n  captures: [],`
if (original.split(receiptTarget).length - 1 !== 1) throw new Error('Receipt contract changed')

const executionStart = `const browser = await chromium.launch({ headless: true })`
const executionIndex = original.indexOf(executionStart)
if (executionIndex < 0 || original.indexOf(executionStart, executionIndex + 1) >= 0) throw new Error('Execution contract changed')

const execution = `const browser = await chromium.launch({ headless: true })
try {
  if (group === 'visual' || group === 'all') {
    await captureHomeState(browser, viewports[0], { id: 'home-normal-root', route: '/', query: 'homePrivateFixture=1', mode: 'private-personalized', fixture: 'safe-private', orbState: 'idle' })
    await captureHomeState(browser, viewports[0], { id: 'home-normal-home', route: '/home/', query: 'homePrivateFixture=1', mode: 'private-personalized', fixture: 'safe-private', orbState: 'idle' })
    await captureLoading(browser, viewports[0])
    await captureOrbStates(browser)
  }
  if (group === 'desktop' || group === 'all') {
    for (const destination of ['orb', 'ground', 'life-map']) await captureInteraction(browser, viewports[0], 'keyboard', destination)
    await capturePointerLook(browser)
  }
  if (group === 'mobile' || group === 'all') {
    for (const spec of viewports.filter((value) => value.isMobile)) {
      for (const destination of ['orb', 'ground', 'life-map']) await captureInteraction(browser, spec, 'touch', destination)
    }
  }
  if (group === 'portal-fallback' || group === 'all') {
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

const patched = original
  .replace(openTarget, openReplacement)
  .replace(receiptTarget, receiptReplacement)
  .slice(0, executionIndex) + execution

for (const assertion of [
  "if (!verification.passed || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length)",
  "if (!record.fallbackVisible || record.semanticButtons !== 3 || record.diagnostics.pageErrors.length || record.diagnostics.consoleErrors.length)",
  "throw new Error(`Home interaction proof failed for ${id}: ${JSON.stringify(record)}`)",
]) {
  if (!patched.includes(assertion)) throw new Error(`Visual assertion missing after grouping: ${assertion}`)
}

await writeFile(generatedUrl, patched, 'utf8')
try {
  await import(`${generatedUrl.href}?group=${encodeURIComponent(group)}&exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
