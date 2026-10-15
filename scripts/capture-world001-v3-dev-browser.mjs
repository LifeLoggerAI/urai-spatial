#!/usr/bin/env node
// Dev-only, exact-source UrAi Home/World001 V3 browser evidence. Not a release approval.
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requireTier1 = createRequire(path.join(root, 'urai-tier1/package.json'))
const { chromium } = requireTier1('playwright')
const verifyScript = path.join(root, 'scripts/world001-v3-preview-asset.mjs')
const outputDir = path.resolve(process.env.URAI_V3_PROOF_DIR || path.join(root, 'artifacts/world001-v3-dev-browser'))
const head = process.env.URAI_EXACT_HEAD || 'local-unattested'
const port = Number(process.env.URAI_V3_PORT || 3014)
const origin = 'http://127.0.0.1:' + port
const modelPath = '/assets/urai/world001-preview/URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb'
const expectedHash = '84727ed6d335b51f736194a3850d5390a3d4ab8876f07acc8bb08593c5c33717'
const expectedBytes = 2742444
const receipt = { schemaVersion: 'urai-world001-v3-dev-browser-proof-1', head, classification: 'MODELED_INTERPRETIVE_NONPRODUCTION', origin, modelPath, scenarios: [], failures: [], executed: false }
let server, browser
function guard(action) {
  const result = spawnSync(process.execPath, [verifyScript, action], { cwd: root, env: { ...process.env, NODE_ENV: 'development', URAI_V3_DEV_BROWSER_PROOF: 'true' }, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('World001 guard ' + action + ' failed: ' + result.stderr)
}
async function waitReady() {
  const deadline = Date.now() + 150000
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error('Next development server exited before ready')
    try { const response = await fetch(origin + '/home/', { signal: AbortSignal.timeout(4000) }); if (response.ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  throw new Error('Canonical UrAi Home development server did not become ready')
}
async function screenshot(page, name) {
  const file = path.join(outputDir, name + '.png')
  await page.screenshot({ path: file })
  const bytes = await readFile(file)
  return { path: path.basename(file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }
}
async function testProfile(profile) {
  const context = await browser.newContext({
    viewport: profile.viewport, deviceScaleFactor: 1,
    ...(profile.mobile ? { isMobile: true, hasTouch: true } : {}),
    reducedMotion: profile.reducedMotion ? 'reduce' : 'no-preference'
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const response = await page.goto(origin + '/home/?homeAssetReview=1&homePrivateFixture=1&world001ModeledV3=1', { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (!response?.ok()) throw new Error(profile.id + ' Home route did not return HTTP 2xx')
  const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  await owner.waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForFunction(() => {
    const root = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    return root?.getAttribute('data-home-world001-preview') === 'MODELED_INTERPRETIVE_NONPRODUCTION'
      && root?.getAttribute('data-home-assets-ready') === 'true'
  }, null, { timeout: 90000 })
  const loaded = await page.evaluate(async url => {
    const response = await fetch(url)
    const bytes = new Uint8Array(await response.arrayBuffer())
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    return { status: response.status, bytes: bytes.length, sha256: Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('') }
  }, modelPath)
  if (loaded.status !== 200 || loaded.bytes !== expectedBytes || loaded.sha256 !== expectedHash) throw new Error(profile.id + ' V3 GLB runtime bytes disagree with source')
  const before = await owner.evaluate(element => ({ x: Number(element.dataset.homePlayerX), z: Number(element.dataset.homePlayerZ), ready: element.dataset.homeAssetsReady, mode: element.dataset.homeWorld001Preview, navigation: element.dataset.homeV3Navigation }))
  if (before.navigation !== 'bounded-central-terrace-research-not-certified-navmesh') throw new Error('Expected explicit unapproved navmesh classification')
  const initial = await screenshot(page, profile.id + '-arrival')
  if (!profile.mobile) {
    await page.keyboard.down('KeyW')
    await page.waitForTimeout(700)
    await page.keyboard.up('KeyW')
  } else {
    const forward = page.getByRole('button', { name: 'Move forward' })
    await forward.dispatchEvent('pointerdown')
    await page.waitForTimeout(700)
    await forward.dispatchEvent('pointerup')
  }
  await page.waitForTimeout(350)
  const after = await owner.evaluate(element => ({ x: Number(element.dataset.homePlayerX), z: Number(element.dataset.homePlayerZ), nearby: element.dataset.homeNearby, orb: element.dataset.homeOrbState }))
  if (!Number.isFinite(after.x) || !Number.isFinite(after.z) || Math.hypot(after.x - before.x, after.z - before.z) < .05) throw new Error(profile.id + ' first-person locomotion not observed')
  const moved = await screenshot(page, profile.id + '-after-movement')
  const orb = await owner.evaluate(element => element.dataset.homeOrbState)
  if (!orb) throw new Error(profile.id + ' Orb state owner absent')
  if (errors.length) throw new Error(profile.id + ' browser exceptions: ' + errors.join(' | '))
  receipt.scenarios.push({ profile: profile.id, before, after, orb, asset: loaded, screenshots: [initial, moved], observed: 'first-person movement and loaded authored scene; Orb activation NOT independently verified' })
  await context.close()
}
try {
  await mkdir(outputDir, { recursive: true })
  guard('verify-source')
  guard('assert-excluded')
  guard('stage')
  server = spawn('node', [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: path.join(root, 'urai-tier1'), env: { ...process.env, NODE_ENV: 'development', URAI_V3_DEV_BROWSER_PROOF: 'true' }, stdio: 'ignore'
  })
  await waitReady()
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] })
  for (const profile of [
    { id: 'desktop', viewport: { width: 1440, height: 900 } },
    { id: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
    { id: 'reduced-motion', viewport: { width: 1280, height: 800 }, reducedMotion: true }
  ]) await testProfile(profile)
  receipt.executed = true
} catch (error) {
  receipt.failures.push(String(error?.stack || error))
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
  if (server) {
    server.kill('SIGTERM')
    await new Promise(resolve => { if (server.exitCode !== null) return resolve(); server.once('exit', resolve); setTimeout(resolve, 7000).unref() })
  }
  try { guard('clean'); guard('assert-build-excluded') } catch (error) { receipt.failures.push(String(error)); process.exitCode = 1 }
  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify({ head, scenarios: receipt.scenarios.length, failures: receipt.failures.length, receipt: path.join(outputDir, 'receipt.json') }))
}
