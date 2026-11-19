// Review-only Chromium/Playwright regression. Requires a LOCAL Next build served
// from the exact checked-out source; it never targets production or staging.
// Run separately with URAI_R1548_BUILD_FACE_LAB=off and =on. A skipped on-mode
// case is NOT browser acceptance. No credentials or provider messages required.
import { expect, test, type Page } from '@playwright/test'

const mode = process.env.URAI_R1548_BUILD_FACE_LAB
const optedIn = mode === 'on' || mode === 'off'
if (mode && !optedIn) {
  throw new Error('URAI_R1548_BUILD_FACE_LAB must be on or off when supplied')
}
const base = process.env.URAI_R1548_BASE_URL || 'http://127.0.0.1:4398'
const target = new URL(base)
if (optedIn && (target.protocol !== 'http:' || target.hostname !== '127.0.0.1' || target.pathname !== '/' || target.search)) {
  throw new Error('R1548 tests are restricted to an explicit http://127.0.0.1:<port> local server')
}
test.beforeEach(() => {
  test.skip(!optedIn, 'R1548 browser checks require a deliberately selected local flag-on or flag-off build')
  test.setTimeout(180_000)
})

const FACE = '/__digital-human-dev/anonymous-face-morph-v1.glb'
const MODEL_ROOT = '/assets/urai/generated/human-makehuman-v4/'
const MODEL_NAMES = ['guide', 'archivist', 'guardian', 'builder', 'mirror', 'trickster']

function route(suffix = '') { return new URL(`/council${suffix}`, target).toString() }
function trackFaceRequests(page: Page) {
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === FACE) requests.push(request.url())
  })
  return requests
}
async function expectCouncilIntact(page: Page) {
  await expect(page.getByTestId('urai-council-route')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-council-embodied="true"]')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('[data-council-embodied="true"] canvas')).toBeVisible({ timeout: 45_000 })
  await expect(page.getByRole('heading', { name: 'The Cartographer' })).toBeVisible()
  const conversation = page.getByRole('region', { name: 'Live Council conversation' })
  await expect(conversation).toBeVisible()
  await expect(conversation.getByLabel('Council provider')).toBeVisible()
  await expect(conversation.getByRole('textbox', { name: 'Ask The Cartographer' })).toBeVisible()
  await expect(conversation.getByRole('button', { name: 'Ask Council' })).toBeVisible()
  await expect(page.getByTestId('urai-council-semantic-fallback')).toHaveCount(0)
}

// This runs for BOTH the disabled build and the explicitly enabled review build.
for (const suffix of ['', '?anonymousFaceLab=0', '?anonymousFaceLab=true', '?ordinary=1']) {
  test(`ordinary Council ${suffix || '(no query)'} never mounts/requests the lab`, async ({ page }) => {
    const faceRequests = trackFaceRequests(page)
    await page.goto(route(suffix), { waitUntil: 'domcontentloaded' })
    await expectCouncilIntact(page)
    await page.waitForTimeout(1200)
    await expect(page.getByTestId('anonymous-facial-calibration')).toHaveCount(0)
    expect(faceRequests).toEqual([])
  })
}

test('query alone cannot enable lab in the flag-off build', async ({ page }) => {
  test.skip(mode !== 'off', 'requires a clean build without the public calibration flag')
  const faceRequests = trackFaceRequests(page)
  await page.goto(route('?anonymousFaceLab=1'), { waitUntil: 'domcontentloaded' })
  await expectCouncilIntact(page)
  await page.waitForTimeout(1200)
  await expect(page.getByTestId('anonymous-facial-calibration')).toHaveCount(0)
  expect(faceRequests).toEqual([])
})

test('flag-off build must not serve anonymous review GLB, including stale output', async ({ request }) => {
  test.skip(mode !== 'off', 'requires flag-off/default or release build')
  const response = await request.get(new URL(FACE, target).toString())
  expect(response.status(), 'no static review GLB may remain accessible from a default/release server').toBe(404)
})

test('original six Council character GLBs load and the conversation stays usable', async ({ page }) => {
  const responses = new Map<string, number>()
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname
    if (path.startsWith(MODEL_ROOT) && path.endsWith('.glb')) responses.set(path, response.status())
  })
  await page.goto(route(), { waitUntil: 'domcontentloaded' })
  await expectCouncilIntact(page)
  await expect.poll(() => MODEL_NAMES.filter((name) => responses.get(`${MODEL_ROOT}council-${name}-human-makehuman-v4.glb`) === 200).length,
    { timeout: 45_000 }).toBe(6)
  await expect(page.getByRole('button', { name: 'Return Home' })).toBeVisible()
  // Asset responses are a loading check, not independent visual proof that six rigs are visible.
})

test('explicit lab mode mounts and requests exactly the synthetic GLB', async ({ page }) => {
  test.skip(mode !== 'on', 'requires an on-flag local build with generated synthetic assets')
  const faceRequests = trackFaceRequests(page)
  const responses: number[] = []
  page.on('response', (response) => { if (new URL(response.url()).pathname === FACE) responses.push(response.status()) })
  await page.goto(route('?anonymousFaceLab=1'), { waitUntil: 'domcontentloaded' })
  await expectCouncilIntact(page)
  await expect(page.getByTestId('anonymous-facial-calibration')).toBeVisible({ timeout: 50_000 })
  const telemetry = page.getByTestId('calibration-telemetry')
  await expect.poll(async () => Number(await telemetry.getAttribute('data-morph-bindings')), { timeout: 60_000 }).toBeGreaterThan(0)
  expect(faceRequests.length).toBeGreaterThan(0)
  expect(faceRequests.every((u) => new URL(u).pathname === FACE)).toBe(true)
  expect(responses).toContain(200)
})

test('removing review query through same-document navigation unmounts lab', async ({ page }) => {
  test.skip(mode !== 'on', 'requires an enabled review build')
  await page.goto(route('?anonymousFaceLab=1'), { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('anonymous-facial-calibration')).toBeVisible({ timeout: 50_000 })
  await page.evaluate(() => { window.history.pushState({}, '', '/council') })
  await expect.poll(() => new URL(page.url()).searchParams.has('anonymousFaceLab')).toBe(false)
  await expect(page.getByTestId('anonymous-facial-calibration')).toHaveCount(0, { timeout: 10_000 })
  await expectCouncilIntact(page)
  // Expected to FAIL at R1548 if the URL gate is only checked in a one-time effect.
})

test('404 face fixture must not destroy the six original Council or conversation', async ({ page }) => {
  test.skip(mode !== 'on', 'requires enabled review build; intercept synthetic request')
  const intercepted: string[] = []
  await page.route(`**${FACE}`, async (routeHandle) => {
    intercepted.push(routeHandle.request().url())
    await routeHandle.fulfill({ status: 404, contentType: 'text/plain', body: 'fixture deliberately unavailable' })
  })
  await page.goto(route('?anonymousFaceLab=1'), { waitUntil: 'domcontentloaded' })
  await expect.poll(() => intercepted.length, { timeout: 30_000 }).toBeGreaterThan(0)
  await expectCouncilIntact(page)
  // Expected to expose an R1548 boundary issue if a rejected useGLTF tears down the scene.
})

test('reduced motion damps active facial morphs without losing Council UI', async ({ page }) => {
  test.skip(mode !== 'on', 'requires enabled review build and synthetic GLB')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route('?anonymousFaceLab=1'), { waitUntil: 'domcontentloaded' })
  await expectCouncilIntact(page)
  await expect(page.getByTestId('anonymous-facial-calibration')).toBeVisible({ timeout: 50_000 })
  await page.getByTestId('calibration-play').click()
  const telemetry = page.getByTestId('calibration-telemetry')
  await expect.poll(async () => Number(await telemetry.getAttribute('data-max-weight')),
    { timeout: 15_000 }).toBeGreaterThan(0.2)
  expect(Number(await telemetry.getAttribute('data-max-weight'))).toBeLessThan(0.45)
})

test('Stop returns morph weights and playback state to neutral', async ({ page }) => {
  test.skip(mode !== 'on', 'requires enabled review build and synthetic GLB')
  await page.goto(route('?anonymousFaceLab=1'), { waitUntil: 'domcontentloaded' })
  await expectCouncilIntact(page)
  await expect(page.getByTestId('anonymous-facial-calibration')).toBeVisible({ timeout: 50_000 })
  await page.getByTestId('calibration-play').click()
  const telemetry = page.getByTestId('calibration-telemetry')
  await expect.poll(async () => Number(await telemetry.getAttribute('data-max-weight')),
    { timeout: 15_000 }).toBeGreaterThan(0.5)
  await page.getByTestId('calibration-stop').click()
  await expect.poll(async () => Number(await telemetry.getAttribute('data-max-weight')),
    { timeout: 12_000 }).toBe(0)
  await expect(telemetry).toHaveAttribute('data-playing', 'false')
  await expectCouncilIntact(page)
})

test('mobile ordinary Council keeps its conversation and never loads facial lab', async ({ page }) => {
  const faceRequests = trackFaceRequests(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(route(), { waitUntil: 'domcontentloaded' })
  await expectCouncilIntact(page)
  await expect(page.getByTestId('anonymous-facial-calibration')).toHaveCount(0)
  expect(faceRequests).toEqual([])
})

test('no WebGL never starts a facial lab, and semantic Council fallback remains available', async ({ page }) => {
  const faceRequests = trackFaceRequests(page)
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (kind === 'webgl' || kind === 'webgl2') return null
        return Reflect.apply(original, this, [kind, ...rest])
      },
    })
  })
  await page.goto(route('?anonymousFaceLab=1'), { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('urai-council-semantic-fallback')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('WebGL is unavailable on this device.')
  await expect(page.getByRole('navigation', { name: 'Council fallback destinations' })).toBeVisible()
  await expect(page.getByTestId('anonymous-facial-calibration')).toHaveCount(0)
  expect(faceRequests).toEqual([])
})
