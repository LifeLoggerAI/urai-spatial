/** Wave 40: non-release real-app authenticated journey boundary probe.
 * Not Gold Master acceptance. No provider, production, or personal data.
 * The real login/fixture producer must supply Playwright storage state created
 * through the original application's Firebase emulator client.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = require('playwright')
const sha = process.env.URAI_EXACT_HEAD || ''
assert.match(sha, /^[a-f0-9]{40}$/, 'Exact candidate SHA required')
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080')
assert.equal(process.env.GCLOUD_PROJECT, 'demo-urai-auth-journey')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const origin = new URL(base)
assert.equal(origin.protocol, 'http:', 'No HTTPS remote origin for emulator proof')
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname), 'Refuse production target')
const dir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/authenticated-full-journey')
await mkdir(dir, { recursive: true })
const receipt = { schema:'urai-authenticated-full-journey-probe-v1', sha,
  classification:'NON_RELEASE_PARTIAL_REAL_APP_PROBE', result:'FAIL_CLOSED',
  authenticatedApplicationJourney:false, authenticPrivateMediaAcceptance:false,
  physicalDeviceAcceptance:false, finalVisualArtAcceptance:false,
  states:[], images:[], failures:[] }
let browser
try {
  assert.ok(process.env.URAI_EMULATOR_AUTH_STORAGE_STATE,
    'Missing real-app emulator login storageState produced by the owner login fixture')
  const storageState = JSON.parse(await readFile(process.env.URAI_EMULATOR_AUTH_STORAGE_STATE,'utf8'))
  assert.ok(Array.isArray(storageState.origins), 'Invalid Playwright storageState')
  browser = await chromium.launch({ headless:true })
  const context = await browser.newContext({ storageState, reducedMotion:'reduce' })
  const page = await context.newPage()
  page.on('pageerror', e => receipt.failures.push('pageerror:'+String(e)))
  const response = await page.goto(base+'/home/', { waitUntil:'domcontentloaded',timeout:90000 })
  assert.ok(response?.ok(), 'Real Home response did not succeed')
  assert.equal(new URL(page.url()).searchParams.has('demo'),false,'Demo mode forbidden')
  const home=page.getByTestId('urai-persistent-world-shell')
  await home.waitFor({state:'visible',timeout:90000})
  const shot=await page.screenshot({path:path.join(dir,'real-home-entry.png'),animations:'disabled'})
  receipt.images.push({name:'real-home-entry.png',sha256:createHash('sha256').update(shot).digest('hex')})
  receipt.states.push({state:'real-home-rendered',pathname:new URL(page.url()).pathname})
  // This is intentionally a boundaried probe, not a substitute for Auth/Consent,
  // original physical Orb movement, owner-scoped Life Map, Focus/Replay and revocation.
  throw new Error('NOT_YET_BOUND: real client auth+consent, Orb movement, private Life Graph and Replay')
} catch(e) {
  receipt.failures.push(String(e))
  process.exitCode=1
} finally {
  await browser?.close()
  await writeFile(path.join(dir,'receipt.json'),JSON.stringify(receipt,null,2))
}
