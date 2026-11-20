'use strict'
// R1513 HOLD — browser acceptance for localhost-only canonical Privacy lab.
// Run only while local Auth, Functions, Firestore and Storage emulators are up.
// Build the app with explicit disposable Firebase public env and lab flag.
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const project = 'urai-privacy-r1512-disposable'
assert.equal(process.env.GCLOUD_PROJECT, project, 'Disposable emulator project is mandatory')
for (const name of ['GOOGLE_APPLICATION_CREDENTIALS', 'RUNPOD_API_KEY', 'FIREBASE_TOKEN', 'VERCEL_TOKEN']) {
  assert.ok(!process.env[name], 'No cloud credential may be present: ' + name)
}
const base = process.env.URAI_CANONICAL_LAB_URL || 'http://127.0.0.1:31614'
const url = new URL(base)
assert.equal(url.protocol, 'http:')
assert.ok(['127.0.0.1','localhost'].includes(url.hostname), 'No hosted application permitted')
const steps = []
const trace = name => { steps.push(name); console.log('PASS', steps.length, name) }

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-gpu'] })
  const context = await browser.newContext({ viewport: { width: 1120, height: 820 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const resultContains = async text => page.waitForFunction(
    expected => (document.querySelector('pre[aria-label="Canonical callable response"]')?.textContent || '').includes(expected),
    text, { timeout: 16000 },
  )
  try {
    const response = await page.goto(base + '/privacy-canonical-lab', { waitUntil: 'domcontentloaded', timeout: 20000 })
    assert.equal(response?.status(), 200)
    await page.waitForFunction(() => document.querySelector('[data-lab-enabled="true"]') !== null, null, { timeout: 16000 })
    trace('opt-in disposable localhost lab activated')

    await page.getByRole('button', { name: 'Create disposable local test account' }).click()
    await page.getByText('Signed into local Auth emulator.').waitFor({ timeout: 18000 })
    trace('disposable Firebase Auth account created')

    await page.getByLabel('Status').selectOption('granted')
    await page.getByRole('button', { name: 'Submit canonical consent' }).click()
    await resultContains('"status": "granted"')
    trace('server canonical memory consent accepted')

    await page.getByRole('button', { name: 'Re-evaluate decision' }).click()
    await resultContains('"allowed": true')
    trace('canonical consent evaluated allowed')

    await page.getByRole('button', { name: 'Request account-wide export' }).click()
    await resultContains('"exportJobId"')
    trace('account-wide export request queued, not completed')

    await page.locator('[data-canonical-export-status="pending"]').waitFor({ timeout: 16000 })
    assert.equal(await page.getByRole('button', { name: 'Check completed export availability' }).isDisabled(), true)
    assert.equal(await page.getByRole('link', { name: 'Download completed account export' }).count(), 0)
    trace('server-observed pending export cannot request a download')

    await page.getByLabel('Type REQUEST ACCOUNT DELETION').fill('REQUEST ACCOUNT DELETION')
    await page.getByRole('button', { name: 'Submit pending account deletion request' }).click()
    await resultContains('"requestId"')
    await page.locator('[data-canonical-deletion-status="pending"]').waitFor({ timeout: 16000 })
    trace('pending account deletion request only')

    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.getByText('No local test identity signed in.').waitFor({ timeout: 16000 })
    await page.waitForFunction(() => document.querySelector('pre[aria-label="Canonical callable response"]')?.textContent === 'No local authority verified.')
    assert.equal(await page.getByRole('link', { name: 'Download completed account export' }).count(), 0)
    trace('local account signed out and previous request results cleared')

    assert.equal(steps.length, 8)
    assert.deepEqual(pageErrors, [])
    console.log('R1513_LOCAL_BROWSER_EMULATOR_PASS ' + JSON.stringify({
      checksPassed: steps.length, steps, pageErrors: pageErrors.length,
      spatialSource: process.env.URAI_EXACT_SHA || 'unverified',
      actualEmulators: ['Authentication','Functions','Firestore','Storage'],
      productionWrites: false, destructiveDeletionExecuted: false, releaseAuthorized: false,
    }))
  } finally {
    await browser.close()
  }
}
run().catch(error => { console.error('R1513_BROWSER_FAILURE', error.stack || String(error)); process.exitCode = 1 })
