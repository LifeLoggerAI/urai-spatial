import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const runtime = path.join(root, 'urai-tier1')
const requireRuntime = createRequire(path.join(runtime, 'package.json'))
const { chromium } = requireRuntime('playwright')
const { build } = createRequire(requireRuntime.resolve('tsx/package.json'))('esbuild')
const out = path.resolve(process.env.SPATIAL_HYDRATION_PROOF_OUT || path.join(os.tmpdir(), 'urai-quality-hydration-proof'))
await fs.mkdir(out, { recursive: true })
const probe = `import React from 'react';
 import {useAdaptiveSpatialQuality} from './src/spatial/performance/useAdaptiveSpatialQuality';
 function Probe(){const p=useAdaptiveSpatialQuality();
   if(typeof window!=='undefined')window.profiles.push(p);
   return <output data-tier={p.tier} data-motion={String(p.reducedMotion)} data-visible={String(p.documentVisible)} data-dpr={p.pixelRatioMax}>{JSON.stringify(p)}</output>}`
const options = { bundle: true, write: false, jsx: 'automatic', tsconfig: path.join(runtime, 'tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' } }
const serverBundle = await build({ ...options, platform: 'node', format: 'cjs', packages: 'external', stdin: { contents: probe + `;import {renderToString} from 'react-dom/server';export const html=renderToString(<Probe/>);`, loader: 'tsx', resolveDir: runtime } })
const module = { exports: {} }
new Function('require', 'module', 'exports', serverBundle.outputFiles[0].text)(requireRuntime, module, module.exports)
const html = module.exports.html
assert.match(html, /data-tier="medium"/)
const browserBundle = await build({ ...options, platform: 'browser', format: 'iife', stdin: { contents: probe + `;import {hydrateRoot} from 'react-dom/client';window.profiles=[];window.recoverable=[];hydrateRoot(document.getElementById('root'),<Probe/>,{onRecoverableError:e=>window.recoverable.push(String(e))});`, loader: 'tsx', resolveDir: runtime } })
const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') {res.setHeader('Content-Type', 'text/javascript');res.end(browserBundle.outputFiles[0].contents)}
  else {res.setHeader('Content-Type', 'text/html');res.end(`<div id="root">${html}</div><script src="/bundle.js"></script>`)}
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
const checks = []
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}), args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('console', m => {if(m.type() === 'error') errors.push(m.text())})
  page.on('pageerror', e => errors.push(String(e)))
  await page.addInitScript(() => {Object.defineProperty(navigator, 'hardwareConcurrency', {value: 8});Object.defineProperty(navigator, 'deviceMemory', {value: 8})})
  const base = `http://127.0.0.1:${server.address().port}`
  await page.goto(base)
  await page.locator('[data-tier="low"][data-motion="true"]').waitFor()
  assert.equal(await page.evaluate(() => window.profiles[0].tier), 'medium')
  assert.equal(await page.evaluate(() => window.profiles[0].reducedMotion), false)
  checks.push('SSR and initial hydration snapshot agree; reduced motion applied after mount')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('[data-tier="high"][data-motion="false"]').waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('[data-tier="medium"]').waitFor()
  checks.push('motion and viewport changes still update quality')
  await page.goto(base + '/?testMode=1&quality=low&dpr=0.75&freeze=1')
  await page.locator('[data-tier="low"][data-motion="true"][data-dpr="0.75"]').waitFor()
  const first = await page.evaluate(() => window.profiles[0])
  assert.equal(first.tier, 'medium'); assert.equal(first.pixelRatioMax, 1.35)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  assert.equal(await page.locator('output').getAttribute('data-tier'), 'low')
  checks.push('deterministic quality/DPR/freeze hydrate safely and remain authoritative')
  assert.deepEqual(await page.evaluate(() => window.recoverable), [])
  assert.deepEqual(errors, [])
  const receipt = { exactHead: process.env.URAI_EXACT_HEAD || null, checks, errors, scope: 'Actual adaptive hook SSR/hydration and browser updates; no graphics/device acceptance' }
  await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2))
  console.log(JSON.stringify(receipt))
} finally {await browser?.close();server.closeAllConnections();await new Promise(resolve => server.close(resolve))}
