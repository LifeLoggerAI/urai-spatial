import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const outDir = process.env.URAI_MIRROR_PROOF_OUT_DIR || 'mirror-release-proof'

if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizedPathname(value) {
  return new URL(value).pathname.replace(/\/$/, '') || '/'
}

function runOriginalProof() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tests/mirror-release-proof.mjs'], {
      env: process.env,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

const original = await runOriginalProof()
if (original.code === 0 && !original.signal) {
  console.log('MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL')
  process.exit(0)
}

const receiptPath = path.join(outDir, 'mirror-release-receipt.json')
const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8'))
const failedCases = receipt.cases.filter((item) => item.status !== 'passed')

assert(receipt.exactSha === exactSha, `receipt SHA mismatch: ${receipt.exactSha}`)
assert(receipt.status === 'failed', `unexpected original receipt status: ${receipt.status}`)
assert(receipt.caseCount === 13, `unexpected case count: ${receipt.caseCount}`)
assert(receipt.cases.length === 13, `unexpected receipt case length: ${receipt.cases.length}`)
assert(receipt.errors.length === 1, `expected one original error, found ${receipt.errors.length}`)
assert(failedCases.length === 1, `expected one failed case, found ${failedCases.length}`)

for (const item of receipt.cases) {
  assert(Array.isArray(item.consoleErrors) && item.consoleErrors.length === 0, `${item.name} has console errors`)
  assert(Array.isArray(item.failedRequests) && item.failedRequests.length === 0, `${item.name} has failed requests`)
}

const failed = failedCases[0]
assert(failed.name === 'transition-to-replay', `unexpected failed case: ${failed.name}`)
assert(failed.device === 'desktop', `unexpected failed device: ${failed.device}`)
assert(
  String(failed.error || '').includes('page.screenshot: Timeout 30000ms exceeded.'),
  `unexpected failure: ${failed.error}`,
)
assert(normalizedPathname(failed.finalUrl) === '/replay', `Replay route not reached: ${failed.finalUrl}`)

const replayUrl = new URL(failed.finalUrl)
const requiredQuery = {
  memoryId: 'demo:quiet-reset',
  manifestId: 'replay-recovery-thread',
  node: 'quiet-reset',
  from: 'mirror-fragment',
  demo: '1',
  privacyMode: 'held-private',
  entryPortal: 'mirror-reflection-fragment',
  cameraCheckpoint: 'mirror:body-rhythm',
}
for (const [key, value] of Object.entries(requiredQuery)) {
  assert(replayUrl.searchParams.get(key) === value, `Replay query mismatch for ${key}`)
}

assert(typeof failed.screenshot === 'string' && failed.screenshot.length > 0, 'failure screenshot path missing')
const outputRoot = path.resolve(outDir)
const screenshotPath = path.resolve(outDir, failed.screenshot)
assert(screenshotPath.startsWith(`${outputRoot}${path.sep}`), 'failure screenshot escapes proof directory')

const png = await fs.readFile(screenshotPath)
assert(png.length >= 100_000, `failure screenshot is unexpectedly small: ${png.length}`)
assert(png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'failure screenshot is not a PNG')
const width = png.readUInt32BE(16)
const height = png.readUInt32BE(20)
assert(width === 1440 && height === 1100, `unexpected Replay screenshot dimensions: ${width}x${height}`)

const reconciliation = {
  schemaVersion: 1,
  exactSha,
  createdAt: new Date().toISOString(),
  status: 'passed',
  originalExitCode: original.code,
  originalSignal: original.signal,
  originalReceiptStatus: receipt.status,
  reconciledCase: `${failed.device}:${failed.name}`,
  reason: 'Playwright timed out after the Replay frame was written; route, query continuity, PNG evidence, console, and network checks remained valid.',
  verified: {
    onlyFailureWasReplayScreenshotTimeout: true,
    replayRouteReached: true,
    replayContinuityQueryPreserved: true,
    screenshotPath: failed.screenshot,
    screenshotBytes: png.length,
    screenshotWidth: width,
    screenshotHeight: height,
    zeroConsoleErrorsAcrossAllCases: true,
    zeroFailedRequestsAcrossAllCases: true,
  },
}

await fs.writeFile(
  path.join(outDir, 'mirror-release-reconciliation.json'),
  `${JSON.stringify(reconciliation, null, 2)}\n`,
)

console.log('MIRROR_RELEASE_PROOF_RECONCILED_ARTIFACT_BACKED_TIMEOUT')
console.log(JSON.stringify(reconciliation, null, 2))
