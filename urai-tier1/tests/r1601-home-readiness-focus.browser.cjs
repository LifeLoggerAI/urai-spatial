const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const base = new URL(process.env.URAI_BROWSER_BASE_URL || 'http://127.0.0.1:3005')
const expectedSha = process.env.URAI_EXPECTED_SOURCE_SHA || ''
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Use the isolated local review server')
assert.match(expectedSha, /^[a-f0-9]{40}$/, 'Supply the exact reviewed source SHA')

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const errors = []
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(new URL('/home', base).href, { waitUntil: 'domcontentloaded' })
    assert.equal(await page.locator('meta[name="urai-deployed-sha"]').getAttribute('content'), expectedSha)
    const fallback = page.locator('[data-testid="home-semantic-life-map"][data-home-ascent-authority="semantic-fallback-when-assets-unready"]')
    await fallback.waitFor({ state: 'visible', timeout: 30000 })
    await fallback.focus()
    assert.equal(await fallback.evaluate(node => document.activeElement === node), true)
    // Wait for real authored assets. Do not manufacture scene readiness or route events.
    await page.waitForFunction(() => {
      const control = document.querySelector('[data-testid="home-semantic-life-map"]')
      return control?.tagName === 'BUTTON' && !control.disabled
        && control.getAttribute('data-home-ascent-authority') === 'governed-scene-transition'
    }, null, { timeout: 90000 })
    const ready = page.locator('[data-testid="home-semantic-life-map"]')
    assert.equal(await ready.evaluate(node => document.activeElement === node), true, 'Home readiness must preserve user keyboard focus')
    await page.keyboard.press('Enter')
    await page.waitForURL(url => url.pathname.replace(/\/+$/, '') === '/life-map', { timeout: 30000 })
    assert.equal(errors.length, 0, JSON.stringify(errors))
    console.log(JSON.stringify({ status: 'PASS', sourceSha: expectedSha, focusedFallback: true, readyFocusRetained: true, keyboardLifeMapNavigation: true, pageErrors: errors }))
  } finally {
    await browser.close()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
