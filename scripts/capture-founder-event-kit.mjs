#!/usr/bin/env node
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.URAI_EVENT_BASE_URL || 'http://127.0.0.1:3001'
const outDir = process.env.URAI_EVENT_OUT_DIR || 'founder-event-kit-output'
const screenshotDir = path.join(outDir, 'screenshots')
const videoDir = path.join(outDir, 'video')
const holdMs = Number(process.env.URAI_EVENT_HOLD_MS || 4500)

const routes = [
  { name: 'event', route: '/event', label: 'Founder destination', markers: ['Sample-data demonstration', 'https://urai.app/event'] },
  { name: 'home', route: '/home', label: 'Home', markers: ['Own your life', 'Step inside yourself'] },
  { name: 'life-map', route: '/life-map', label: 'Life Map', markers: ['Life Map'] },
  { name: 'focus', route: '/focus?memoryId=quiet-reset', label: 'Focus', markers: ['The Quiet Reset', 'Selected memory'] },
  { name: 'replay', route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', label: 'Replay', markers: ['Replay'] },
  { name: 'mirror', route: '/mirror', label: 'Mirror', markers: ['Mirror'] },
  { name: 'passport', route: '/passport', label: 'Passport', markers: ['Passport'] },
  { name: 'status', route: '/status', label: 'Status', markers: ['Launch locked', 'Pending proof'] },
]

const piiPatterns = [
  { id: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { id: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
  { id: 'credential', pattern: /\b(?:api[_ -]?key|client[_ -]?secret|password|bearer token)\s*[:=]/i },
  { id: 'environment-file', pattern: /(?:^|\s)\.env(?:\.|\s|$)/i },
]

function absolute(route) {
  return new URL(route, baseUrl).toString()
}

function portableRelative(from, to) {
  return path.relative(from, to).replaceAll('\\', '/')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function settle(page, markers = []) {
  if (markers.length > 0) {
    await page.getByText(markers[0], { exact: false }).first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  }
  await page.waitForTimeout(1200)
}

await fs.rm(outDir, { recursive: true, force: true })
await fs.mkdir(screenshotDir, { recursive: true })
await fs.mkdir(videoDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const consoleErrors = []
const results = []
let context = null
let page = null
let video = null

try {
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  })
  page = await context.newPage()
  video = page.video()

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error?.message || error)))

  for (const item of routes) {
    const url = absolute(item.route)
    const screenshot = path.join(screenshotDir, `${String(results.length + 1).padStart(2, '0')}-${item.name}.png`)
    let response = null
    let body = ''
    let routeError = ''

    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await settle(page, item.markers)
      body = await page.locator('body').innerText()
      await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' })
    } catch (error) {
      routeError = String(error?.message || error)
      body = await page.locator('body').innerText().catch(() => '')
      await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' }).catch(() => {})
    }

    const missingMarkers = item.markers.filter((marker) => !body.toLowerCase().includes(marker.toLowerCase()))
    const piiFindings = piiPatterns.filter(({ pattern }) => pattern.test(body)).map(({ id }) => id)
    const unsafeLinks = await page.locator('a[href^="/admin"], a[href^="/internal"], a[href*="console.firebase.google.com"]').count().catch(() => 0)
    const passwordInputs = await page.locator('input[type="password"]').count().catch(() => 0)
    const eventDisclosure = item.name !== 'event' || (await page.locator('[data-demo-data="synthetic-sample-only"]').count().catch(() => 0)) === 1

    results.push({
      ...item,
      url,
      status: response?.status() ?? null,
      title: await page.title().catch(() => ''),
      missingMarkers,
      piiFindings,
      unsafeLinks,
      passwordInputs,
      eventDisclosure,
      screenshot: portableRelative(outDir, screenshot),
      error: routeError,
    })
    await page.waitForTimeout(holdMs)
  }
} finally {
  if (page) await page.close().catch(() => {})
  if (context) await context.close().catch(() => {})
  await browser.close().catch(() => {})
}

const recordedVideo = video ? await video.path().catch(() => '') : ''
const videoTarget = path.join(videoDir, 'urai-founder-event-demo.webm')
if (recordedVideo && recordedVideo !== videoTarget) await fs.rename(recordedVideo, videoTarget)

const failures = results.flatMap((result) => {
  const issues = []
  if (result.error) issues.push(`${result.name}: ${result.error}`)
  if (result.status !== 200) issues.push(`${result.name}: HTTP ${result.status}`)
  if (result.missingMarkers.length) issues.push(`${result.name}: missing markers ${result.missingMarkers.join(', ')}`)
  if (result.piiFindings.length) issues.push(`${result.name}: potential PII ${result.piiFindings.join(', ')}`)
  if (result.unsafeLinks) issues.push(`${result.name}: unsafe internal/admin links ${result.unsafeLinks}`)
  if (result.passwordInputs) issues.push(`${result.name}: password inputs ${result.passwordInputs}`)
  if (!result.eventDisclosure) issues.push(`${result.name}: sample-data disclosure marker missing`)
  return issues
})
if (consoleErrors.length) failures.push(`browser console errors: ${consoleErrors.join(' | ')}`)
if (!recordedVideo) failures.push('recorded WebM video was not produced')

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  sampleDataOnly: true,
  productionCertificationClaimed: false,
  routes: results,
  video: portableRelative(outDir, videoTarget),
  consoleErrors,
  failures,
}
await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const cards = results.map((result) => `
  <article>
    <img src="${escapeHtml(result.screenshot)}" alt="${escapeHtml(result.label)} sample-data screenshot">
    <h2>${escapeHtml(result.label)}</h2>
    <p><code>${escapeHtml(result.route)}</code></p>
  </article>`).join('\n')

await fs.writeFile(path.join(outDir, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>URAI Founder Event Offline Kit</title><style>
body{margin:0;background:#020713;color:#fff;font-family:system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px}header{padding:28px;border:1px solid #ffffff22;border-radius:28px;background:#071321}h1{font-size:clamp(2rem,6vw,5rem);line-height:.9}.notice{color:#ffe9a8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:24px}article{padding:14px;border:1px solid #ffffff22;border-radius:22px;background:#ffffff0d}img{width:100%;border-radius:14px;display:block}code{color:#9af8ff}video{width:100%;margin-top:24px;border-radius:22px;background:#000}</style></head>
<body><main><header><p>URAI · FOUNDER EVENT OFFLINE KIT</p><h1>Your life should not look like a dashboard.</h1><p class="notice">Synthetic sample data only. Production certification and exact deployed-SHA proof remain pending.</p></header>
<video controls preload="metadata" src="video/urai-founder-event-demo.webm">Offline video unavailable; use the screenshot gallery below.</video>
<section class="grid">${cards}</section></main></body></html>`)

if (failures.length) {
  console.error('Founder event capture failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Founder event kit captured in ${outDir}`)
