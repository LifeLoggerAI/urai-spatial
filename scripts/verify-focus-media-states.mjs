import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import { createRequire } from 'node:module'

// This renders the actual production component and styles with an existing,
// explicitly disclosed repository demo SVG. It does not certify full-route pixels.
const root = path.resolve(import.meta.dirname, '..')
const requireTierOne = createRequire(path.join(root, 'urai-tier1/package.json'))
const { chromium } = requireTierOne('playwright')
const { build } = createRequire(requireTierOne.resolve('tsx/package.json'))('esbuild')
const output = path.resolve(process.env.FOCUS_MEDIA_PROOF_OUT || path.join(os.tmpdir(), 'urai-focus-media-proof'))
await fs.mkdir(output, { recursive: true })
const source = await fs.readFile(path.join(root, 'urai-tier1/src/app/focus/FocusChamberClient.tsx'), 'utf8')
const css = JSON.parse(source.match(/const focusCss = ("[^\n]*")/)[1])
const script = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
    import {MemoryVisualContent} from './src/app/focus/FocusChamberClient';
    const root=createRoot(document.getElementById('root'));
    window.renderMemory=(url,kind='image')=>root.render(<div className="focusStarMemoryButton"><MemoryVisualContent memory={{title:'Disclosed source-readiness fixture',demo:true,sourceMedia:url?[{kind,url,caption:'Existing repository demo artwork, not an archival memory'}]:[]}}/></div>);
    window.renderMemory(null);`, resolveDir: path.join(root, 'urai-tier1'), loader: 'tsx' },
  bundle: true, write: false, format: 'iife', jsx: 'automatic', tsconfig: path.join(root, 'urai-tier1/tsconfig.json'),
  define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
})
const svg = await fs.readFile(path.join(root, 'urai-tier1/public/demo/memories/calm-return.svg'))
const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(script.outputFiles[0].contents) }
  else if (req.url === '/source.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end(svg) }
  else if (req.url === '/slow.svg') { /* Browser clock verifies bounded loading without a response. */ }
  else if (req.url === '/failed.svg') { res.writeHead(404); res.end('unavailable') }
  else { res.setHeader('Content-Type', 'text/html'); res.end(`<html><style>${css}body{margin:0;background:#02040b;color:white}#root{display:grid;place-items:center;height:100vh}.focusStarMemoryButton{background:radial-gradient(ellipse,#d88542,transparent 68%)}</style><div id="root"></div><script src="/bundle.js"></script></html>`) }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
const checks = []
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []; page.on('pageerror', e => {errors.push(String(e));console.error(String(e))})
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.locator('[data-focus-media-state="missing"]').waitFor()
  assert.equal(await page.locator('.focusMediaDisclosure').isVisible(), true)
  assert.match(await page.locator('.focusMediaDisclosure').innerText(), /no recorded image/)
  await page.screenshot({ path: path.join(output, 'missing-phone.png') }); checks.push('visible no-source disclosure')
  await page.evaluate(() => window.renderMemory('/source.svg'))
  await page.locator('[data-focus-media-state="ready"]').waitFor()
  assert.ok(await page.locator('img').evaluate(img => img.naturalWidth > 0 && getComputedStyle(img).visibility === 'visible'))
  assert.match(await page.locator('.focusMediaDisclosure').innerText(), /Demo source/)
  await page.screenshot({ path: path.join(output, 'ready-phone.png') }); checks.push('decoded disclosed source')
  await page.evaluate(() => window.renderMemory('/failed.svg'))
  await page.locator('[data-focus-media-state="failed"]').waitFor()
  assert.equal(await page.locator('img').count(), 0)
  assert.match(await page.locator('.focusMediaDisclosure').innerText(), /Source unavailable/)
  await page.screenshot({ path: path.join(output, 'failed-phone.png') }); checks.push('failed source never advertised ready')
  await page.evaluate(() => window.renderMemory('/failed.svg', 'video'))
  await page.locator('[data-focus-media-state="failed"][data-focus-media-kind="video"]').waitFor()
  assert.equal(await page.locator('video').count(), 0)
  checks.push('failed video never advertised decoded')
  await page.clock.install()
  await page.evaluate(() => window.renderMemory('/slow.svg'))
  await page.locator('[data-focus-media-state="loading"]').waitFor()
  await page.clock.fastForward(12_100)
  await page.locator('[data-focus-media-state="failed"]').waitFor()
  checks.push('12-second bounded loading')
  await page.evaluate(() => window.renderMemory('/source.svg'))
  await page.locator('[data-focus-media-state="ready"]').waitFor()
  checks.push('selection change resets failed readiness')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: path.join(output, 'ready-desktop.png') })
  assert.deepEqual(errors, [])
  const receipt = { exactHead: process.env.URAI_EXACT_HEAD || null, checks, scope: 'Actual production memory component; existing project demo SVG; no full-route, stellar, archival, device, or AAA acceptance', errors }
  await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2))
  console.log(JSON.stringify(receipt))
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
