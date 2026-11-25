import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const project = 'urai-privacy-r1512-disposable'
const base = process.env.URAI_ENROLLMENT_BROWSER_URL || 'http://127.0.0.1:3018'
assert.equal(new URL(base).hostname, '127.0.0.1')
assert.equal(new URL(base).protocol, 'http:')
assert.equal(process.env.GCLOUD_PROJECT, project)
assert.ok(process.env.URAI_TEST_CHROMIUM, 'Use an installed Chromium executable')
const firestore = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
const profile = async uid => fetch(`${firestore}/users/${uid}`, { headers: { Authorization: 'Bearer owner' } })
async function waitProfile(uid) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await profile(uid)
    if (result.ok) return result.json()
    assert.equal(result.status, 404)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('Owner profile was not enrolled through the application')
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.URAI_TEST_CHROMIUM, args: ['--disable-gpu'] })
const results = []
try {
  for (const route of ['/login', '/home']) {
    const context = await browser.newContext({ viewport: { width: 1120, height: 820 }, reducedMotion: 'reduce' })
    let blockFirestore = true, ownerId = null
    const remoteRequests = new Set()
    await context.route('**/*', async request => {
      const url = new URL(request.request().url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { remoteRequests.add(url.hostname); return request.abort() }
      if (blockFirestore && url.port === '8080') return request.abort()
      return request.continue()
    })
    let page = await context.newPage()
    page.on('response', async response => {
      if (response.url().includes('accounts:signUp')) {
        const body = await response.json().catch(() => ({}))
        ownerId = body.localId ?? null
      }
    })
    await page.goto(`${base}/privacy-canonical-lab`, { waitUntil: 'domcontentloaded', timeout: 180000 })
    await page.locator('[data-lab-enabled="true"]').waitFor({ timeout: 60000 })
    await page.getByRole('button', { name: 'Create disposable local test account' }).click()
    await page.getByText('Signed into local Auth emulator.', { exact: true }).waitFor({ timeout: 30000 })
    for (let attempt = 0; !ownerId && attempt < 30; attempt++) await page.waitForTimeout(100)
    assert.ok(ownerId, 'The app must create a real disposable Auth identity')
    assert.equal((await profile(ownerId)).status, 404, 'Fresh identity must have no preseeded owner profile')
    // Destroy the lab page while writes are blocked. The ordinary destination
    // must enroll the persisted Auth session itself; no fixture writes a profile.
    await page.close()
    blockFirestore = false
    page = await context.newPage()
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
    if (route === '/login') {
      await page.getByText('Your account is ready. Memory permissions remain under your control.', { exact: true }).waitFor({ timeout: 60000 })
      await page.getByRole('link', { name: 'Open Home', exact: true }).waitFor()
    }
    const document = await waitProfile(ownerId)
    assert.deepEqual(document.fields, { uid: { stringValue: ownerId } })
    assert.equal(await page.getByText('Account setup could not be confirmed.', { exact: false }).count(), 0)
    const memories = await fetch(`${firestore}/users/${ownerId}/memories`, { headers: { Authorization: 'Bearer owner' } }).then(response => response.json())
    assert.equal((memories.documents ?? []).length, 0)
    results.push({ route, ownerProfileCreated: true, uidOnly: true, privateMemoriesWritten: 0, blockedRemoteHosts: [...remoteRequests] })
    await context.close()
  }
  console.log('OWNER_PROFILE_BROWSER_EMULATOR_PASS ' + JSON.stringify({ results, manualProfileInitialization: false, hostedCertification: false }))
} finally { await browser.close() }
