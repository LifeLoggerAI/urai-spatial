import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const base = process.env.URAI_LIVE_BASE_URL || 'https://urai.app'
const expectedSha = process.env.URAI_EXPECTED_DEPLOYED_SHA || ''
const out = 'release-control-evidence'
mkdirSync(out, { recursive: true })

const routes = ['/', '/home', '/ground', '/life-map', '/focus', '/replay', '/passport', '/privacy-controls', '/status']
const report = { generatedAt: new Date().toISOString(), base, expectedSha, routes: [], queryChecks: [], fingerprints: [], screenshots: [] }

async function request(path, redirect = 'follow') {
  const response = await fetch(`${base}${path}`, { redirect })
  const body = await response.text()
  return { path, status: response.status, finalUrl: response.url, body, location: response.headers.get('location') || '' }
}

for (const route of routes) {
  const slash = route === '/' ? '/' : `${route}/`
  const plain = await request(route)
  const trailed = await request(slash)
  if (plain.status !== 200 || trailed.status !== 200) throw new Error(`Route parity failed for ${route}: ${plain.status}/${trailed.status}`)
  if (expectedSha && (!plain.body.includes(expectedSha) || !trailed.body.includes(expectedSha))) throw new Error(`Release SHA missing from ${route}`)
  report.routes.push({ route, plainStatus: plain.status, slashStatus: trailed.status, plainFinalUrl: plain.finalUrl, slashFinalUrl: trailed.finalUrl })
}

const queryCases = [
  {
    path: '/focus?memoryId=release-control-memory&manifestId=release-control-manifest&node=release-control-node',
    required: ['memoryId=release-control-memory', 'manifestId=release-control-manifest', 'node=release-control-node'],
  },
  {
    path: '/replay?memoryId=release-control-memory&manifestId=release-control-manifest&node=release-control-node',
    required: ['memoryId=release-control-memory', 'manifestId=release-control-manifest', 'node=release-control-node'],
  },
]

for (const check of queryCases) {
  const response = await request(check.path, 'manual')
  const observed = response.status >= 300 && response.status < 400 ? response.location : response.finalUrl
  for (const token of check.required) {
    if (!observed.includes(token)) throw new Error(`Query preservation failed for ${check.path}: missing ${token} in ${observed}`)
  }
  report.queryChecks.push({ path: check.path, status: response.status, observed })
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
    for (const route of ['/', '/life-map', queryCases[0].path, queryCases[1].path, '/privacy-controls', '/status']) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 60000 })
      if (page.url().includes('/focus') || page.url().includes('/replay')) {
        for (const token of queryCases[0].required) {
          if (!page.url().includes(token)) throw new Error(`Browser query preservation failed for ${route}: missing ${token}`)
        }
      }
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
