import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const base = process.env.URAI_LIVE_BASE_URL || 'https://urai.app'
const expectedSha = process.env.URAI_EXPECTED_DEPLOYED_SHA || ''
const out = 'release-control-evidence'
mkdirSync(out, { recursive: true })

const routes = ['/', '/home', '/ground', '/life-map', '/focus', '/replay', '/passport', '/privacy-controls', '/status']
const report = { generatedAt: new Date().toISOString(), base, expectedSha, routes: [], queryChecks: [], fingerprints: [], screenshots: [] }

async function request(path) {
  const response = await fetch(`${base}${path}`, { redirect: 'follow' })
  const body = await response.text()
  return { path, status: response.status, finalUrl: response.url, body }
}

for (const route of routes) {
  const slash = route === '/' ? '/' : `${route}/`
  const plain = await request(route)
  const trailed = await request(slash)
  if (plain.status !== 200 || trailed.status !== 200) throw new Error(`Route parity failed for ${route}: ${plain.status}/${trailed.status}`)
  if (expectedSha && (!plain.body.includes(expectedSha) || !trailed.body.includes(expectedSha))) throw new Error(`Release SHA missing from ${route}`)
  report.routes.push({ route, plainStatus: plain.status, slashStatus: trailed.status, plainFinalUrl: plain.finalUrl, slashFinalUrl: trailed.finalUrl })
}

for (const check of [
  ['/focus?memoryId=release-control-memory&source=life-map', 'memoryId=release-control-memory'],
  ['/replay?memoryId=release-control-memory&from=focus', 'memoryId=release-control-memory'],
]) {
  const response = await fetch(`${base}${check[0]}`, { redirect: 'manual' })
  const location = response.headers.get('location') || ''
  if (response.status >= 300 && response.status < 400 && !location.includes(check[1])) throw new Error(`Query preservation failed for ${check[0]}`)
  report.queryChecks.push({ path: check[0], status: response.status, location })
}

const root = await request('/')
for (const fingerprint of ['LifeLoggerAI/UrAi', 'legacy-urai-production-deploy', 'DEPLOY_LEGACY_URAI']) {
  const present = root.body.includes(fingerprint)
  report.fingerprints.push({ fingerprint, present })
  if (present) throw new Error(`Legacy runtime fingerprint present: ${fingerprint}`)
}

const browser = await chromium.launch({ headless: true })
try {
  const profiles = [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]
  for (const profile of profiles) {
    const context = await browser.newContext(profile)
    const page = await context.newPage()
    for (const route of ['/', '/life-map', '/focus?memoryId=release-control-memory', '/replay?memoryId=release-control-memory', '/privacy-controls', '/status']) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 60000 })
      const filename = `${profile.name}-${route.replace(/[/?=&]+/g, '-').replace(/^-|-$/g, '') || 'root'}.png`
      await page.screenshot({ path: `${out}/${filename}`, fullPage: true })
      report.screenshots.push(filename)
    }
    await context.close()
  }
} finally {
  await browser.close()
}

writeFileSync(`${out}/smoke-report.json`, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
