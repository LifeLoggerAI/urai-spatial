import playwright from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import {
  addPortableBrowserLibraries,
  chromiumLaunchOptions,
} from './playwright-runtime-helpers.mjs'

const { chromium } = playwright
const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://localhost:3000'
const OUTPUT_DIR = 'artifacts/spatial-network-diagnostic'
const routes = [
  '/home',
  '/ascent',
  '/life-map',
  '/focus?manifestId=seed-memory-bloom',
  '/replay?manifestId=seed-memory-bloom',
  '/unwind',
  '/mirror',
  '/passport',
  '/status',
]

mkdirSync(OUTPUT_DIR, { recursive: true })
addPortableBrowserLibraries()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(timeoutMs = 90_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/home`)
      if (response.ok) return
    } catch {
      // Keep waiting while the diagnostic server starts.
    }
    await sleep(1_000)
  }
  throw new Error(`Timed out waiting for ${BASE_URL}/home`)
}

async function run() {
  await waitForServer()
  const browser = await chromium.launch(chromiumLaunchOptions())
  const failures = new Map()

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

    page.on('response', (response) => {
      if (response.status() < 400) return
      const request = response.request()
      const key = `${response.status()} ${request.method()} ${request.resourceType()} ${response.url()}`
      failures.set(key, (failures.get(key) || 0) + 1)
    })

    page.on('requestfailed', (request) => {
      const key = `FAILED ${request.method()} ${request.resourceType()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`
      failures.set(key, (failures.get(key) || 0) + 1)
    })

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
      await sleep(500)
    }
  } finally {
    await browser.close().catch(() => {})
  }

  const records = [...failures.entries()]
    .map(([request, count]) => ({ request, count }))
    .sort((left, right) => right.count - left.count || left.request.localeCompare(right.request))

  writeFileSync(`${OUTPUT_DIR}/network-failures.json`, JSON.stringify({ routes, records }, null, 2))

  if (records.length === 0) {
    console.log('No failed spatial network requests detected.')
    return
  }

  console.log('Spatial network failures:')
  for (const record of records) console.log(`${record.count}x ${record.request}`)
}

run().catch((error) => {
  console.error(error?.stack || error)
  process.exit(1)
})
