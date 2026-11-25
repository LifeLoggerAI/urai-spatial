import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

// Real-browser transport controls with synthetic format bytes only.
// This does not load, reconstruct or certify a private family place.
const bytes = new Uint8Array(96)
const view = new DataView(bytes.buffer)
for (let offset = 0; offset < bytes.length; offset += 32) {
  view.setFloat32(offset + 8, 2, true)
  for (let axis = 0; axis < 3; axis++) view.setFloat32(offset + 12 + axis * 4, .2, true)
  bytes.set([255, 120, 80, 255, 255, 128, 128, 128], offset + 24)
}
const hash = createHash('sha256').update(bytes).digest('hex')
const bundled = await build({
  stdin: {
    contents: `import { streamCapturedRealitySplat } from './capturedRealitySplatStream';
      import { capturedRealityContentLengthAvailable } from './capturedRealityDelivery';
      window.controls = { streamCapturedRealitySplat, capturedRealityContentLengthAvailable };`,
    resolveDir: fileURLToPath(new URL('../src/spatial/captured-reality/', import.meta.url)),
    sourcefile: 'synthetic-transport-controls.ts', loader: 'ts',
  }, bundle: true, platform: 'browser', write: false, format: 'iife',
})
const requests = []
let credentialLeakRequests = 0
const server = createServer((req, res) => {
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><title>Synthetic transport controls</title><script src="/controls.js"></script>'); return }
  if (req.url === '/controls.js') { res.setHeader('content-type', 'application/javascript'); res.end(bundled.outputFiles[0].contents); return }
  if (req.url === '/leak') { credentialLeakRequests++; res.end(); return }
  requests.push({ path: req.url, authorized: req.headers.authorization === 'Bearer synthetic-current-token' })
  if (req.url === '/redirect') { res.writeHead(302, { location: '/leak' }); res.end(); return }
  if (req.headers.authorization !== 'Bearer synthetic-current-token') { res.writeHead(403); res.end(); return }
  res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': String(bytes.byteLength), 'cache-control': 'no-store' })
  res.write(bytes.subarray(0, 11)); res.write(bytes.subarray(11, 61)); res.end(bytes.subarray(61))
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
let browser
try {
  browser = await chromium.launch({ headless: true, ...(process.env.URAI_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.URAI_CHROMIUM_EXECUTABLE_PATH } : {}) })
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(() => Boolean(window.controls))
  const result = await page.evaluate(async ({ hash, byteLength }) => {
    const { streamCapturedRealitySplat, capturedRealityContentLengthAvailable } = window.controls
    const authority = { expectedSha256: hash, expectedByteLength: byteLength, requestHeaders: async () => ({ Authorization: 'Bearer synthetic-current-token' }) }
    const url = `${location.origin}/private`
    const probe = await capturedRealityContentLengthAvailable(url, 4096, undefined, fetch, authority)
    let chunks = 0
    const base = { url, maxBytes: 4096, chunkSize: 1, signal: new AbortController().signal, authority, onHeader() {}, onChunk() { chunks++ } }
    const receipt = await streamCapturedRealitySplat(base)
    const deny = async operation => { try { await operation(); return false } catch { return true } }
    const anonymousDenied = await deny(() => streamCapturedRealitySplat({ ...base, authority: undefined }))
    const corruptedBindingDenied = await deny(() => streamCapturedRealitySplat({ ...base, authority: { ...authority, expectedSha256: '0'.repeat(64) } }))
    const redirectDenied = await deny(() => streamCapturedRealitySplat({ ...base, url: `${location.origin}/redirect` }))
    const abort = new AbortController(); abort.abort()
    const abortedBeforeFetch = await deny(() => streamCapturedRealitySplat({ ...base, signal: abort.signal }))
    return { probe, receipt, chunks, anonymousDenied, corruptedBindingDenied, redirectDenied, abortedBeforeFetch }
  }, { hash, byteLength: bytes.byteLength })
  assert.equal(result.probe, true)
  assert.deepEqual(result.receipt, { byteSize: 96, pointCount: 3, sha256: hash })
  assert.ok(result.chunks >= 3)
  for (const key of ['anonymousDenied', 'corruptedBindingDenied', 'redirectDenied', 'abortedBeforeFetch']) assert.equal(result[key], true, key)
  assert.equal(credentialLeakRequests, 0)
  assert.equal(requests.filter(request => request.path === '/private').length, 4)
  assert.equal(requests.filter(request => request.path === '/private' && !request.authorized).length, 1)
  console.log(JSON.stringify({ classification: 'SYNTHETIC_BROWSER_TRANSPORT_CONTROLS_ONLY', browserVersion: browser.version(), passedControls: 7, result, redirectedCredentialRequests: credentialLeakRequests }, null, 2))
} finally {
  await browser?.close()
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
}
