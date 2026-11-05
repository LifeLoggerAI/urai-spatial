import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const ARTIFACT_DIR = process.env.URAI_GENESIS_ARTIFACT_DIR || 'artifacts/genesis-nine-state'
const PORT = Number(process.env.URAI_GENESIS_PORT || 3013)
const ORIGIN = `http://127.0.0.1:${PORT}`
const STATES = ['home','ascent','life-map','focus','replay','focus','life-map','home']
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
mkdirSync(ARTIFACT_DIR, { recursive: true })
const report = {
  schemaVersion: 'urai-genesis-nine-state-trace-1',
  sourceCommit: process.env.URAI_GENESIS_EXACT_SHA || null,
  browser: 'chromium',
  productionServer: true,
  states: [], consoleErrors: [], pageErrors: [], requestFailures: [],
  screenshots: [], video: null, trace: 'genesis-nine-state.zip',
  assertion: 'NOT_VERIFIED',
}

async function waitForServer(child, timeout = 90000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (child.exitCode !== null) throw Error(`Production server exited: ${child.exitCode}`)
    try {
      const response = await fetch(ORIGIN)
      if (response.status < 500) return
    } catch {}
    await sleep(500)
  }
  throw Error('Production server did not become ready')
}
async function requireMode(page, name, timeout = 25000) {
  const stage = page.getByTestId('urai-scene-stage')
  await stage.waitFor({ state: 'visible', timeout })
  await page.waitForFunction(expected => {
    const stage = document.querySelector('[data-testid="urai-scene-stage"]')
    return stage?.getAttribute('data-scene-mode') === expected
  }, name, { timeout })
  const actual = await stage.getAttribute('data-scene-mode')
  if (actual !== name) throw Error(`Expected ${name}, got ${actual}`)
  const index = report.states.length
  const screenshot = `${String(index + 1).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: join(ARTIFACT_DIR, screenshot), fullPage: true })
  report.states.push({ number: index + 1, mode: actual, url: page.url(),
    activeScene: await stage.getAttribute('data-scene-mode'),
    visible: await stage.isVisible(), screenshot })
  report.screenshots.push(screenshot)
}
async function stopServer(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(6000)])
  if (child.exitCode === null) child.kill('SIGKILL')
}

const server = spawn('pnpm', ['--filter','urai-tier1','start','--port',String(PORT)], {
  env: { ...process.env, CI: '1', NEXT_TELEMETRY_DISABLED:'1' },
  cwd: process.cwd(), stdio:'inherit',
})
let browser = null
let context = null
try {
  await waitForServer(server)
  browser = await chromium.launch({ headless: true })
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: ARTIFACT_DIR, size: { width: 1440, height: 1000 } },
  })
  await context.tracing.start({ screenshots:true, snapshots:true, sources:true })
  const page = await context.newPage()
  page.on('console', msg => {
    if (msg.type() === 'error') report.consoleErrors.push({ text:msg.text(), url:page.url() })
  })
  page.on('pageerror', error => report.pageErrors.push({ message:error.message, stack:error.stack }))
  page.on('requestfailed', request => report.requestFailures.push({
    url:request.url(), error:request.failure()?.errorText || null,
  }))
  page.on('response', response => {
    if (response.status() >= 400) report.requestFailures.push({
      url:response.url(), httpStatus:response.status(),
    })
  })

  await page.goto(`${ORIGIN}/home`, { waitUntil:'domcontentloaded' })
  await requireMode(page, 'home')
  // Real product action, not direct navigational injection.
  await page.getByRole('button', { name:'Begin Ascent' }).click()
  await requireMode(page, 'ascent', 8000)
  await requireMode(page, 'life-map', 9000)
  const star = page.getByTestId('lifemap-node-seed-memory-bloom')
  await star.waitFor({ state:'visible', timeout:30000 })
  await star.click()
  await requireMode(page, 'focus')
  await page.getByRole('button', { name:'Start Replay' }).click()
  await requireMode(page, 'replay')
  await page.keyboard.press('Escape')
  await requireMode(page, 'focus')
  await page.keyboard.press('Escape')
  await requireMode(page, 'life-map')
  await page.keyboard.press('Escape')
  await requireMode(page, 'home')

  if (JSON.stringify(report.states.map(x=>x.mode)) !== JSON.stringify(STATES))
    throw Error('Canonical navigation state trace mismatch')
  if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length)
    throw Error('Browser errors or missing resources: '+JSON.stringify({
      consoleErrors:report.consoleErrors, pageErrors:report.pageErrors, requestFailures:report.requestFailures,
    }))
  report.assertion = 'PASS'
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error)
  report.assertion = 'FAIL'
  throw error
} finally {
  if (context) {
    await context.tracing.stop({ path:join(ARTIFACT_DIR, report.trace) }).catch(error => {
      report.traceError=String(error)
      report.assertion='FAIL'
    })
    const pages = context.pages()
    const video = pages[0]?.video()
    await context.close().catch(() => {})
    if (video) report.video = await video.path().catch(()=>null)
  }
  if (browser) await browser.close().catch(() => {})
  await stopServer(server)
  writeFileSync(join(ARTIFACT_DIR,'genesis-nine-state-report.json'),JSON.stringify(report,null,2))
}
