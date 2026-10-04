import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// This is an unsigned initial-route inventory, not a personalized journey,
// physical-device certification, or a visual Gold Master verdict.
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const manifestFile = path.join(repositoryRoot, 'release/route-manifest.json')
const manifestBytes = await readFile(manifestFile)
const manifest = JSON.parse(manifestBytes.toString('utf8'))
const checkoutHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim()
const exactHead = (process.env.URAI_EXACT_HEAD || checkoutHead).trim()
if (!/^[0-9a-f]{40}$/.test(exactHead) || exactHead !== checkoutHead) {
  throw new Error('URAI_EXACT_HEAD must identify the checked-out 40-character commit SHA')
}
const committedManifest = execFileSync('git', ['show', `${exactHead}:release/route-manifest.json`], { cwd: repositoryRoot })
if (!manifestBytes.equals(committedManifest)) throw new Error('Route manifest does not match the exact checkout')

const profiles = {
  visual: { id: 'desktop-1440x900', width: 1440, height: 900, isMobile: false, hasTouch: false, noWebGL: false },
  mobile: { id: 'narrow-320x700', width: 320, height: 700, isMobile: true, hasTouch: true, noWebGL: false },
  desktop: { id: 'landscape-844x390', width: 844, height: 390, isMobile: true, hasTouch: true, noWebGL: false },
  'portal-fallback': { id: 'no-webgl-390x844', width: 390, height: 844, isMobile: true, hasTouch: true, noWebGL: true },
}
const group = process.env.URAI_PROOF_GROUP || 'visual'
const profile = profiles[group]
if (!profile) throw new Error(`Unsupported route matrix proof group: ${group}`)
const representativeProfiles = [
  { id: 'tablet-portrait-768x1024', width: 768, height: 1024, isMobile: true, hasTouch: true, noWebGL: false },
  { id: 'tablet-landscape-1024x768', width: 1024, height: 768, isMobile: true, hasTouch: true, noWebGL: false },
  { id: 'wide-desktop-2560x1440', width: 2560, height: 1440, isMobile: false, hasTouch: false, noWebGL: false },
]
const representativeRoutes = ['/home', '/life-map', '/focus', '/replay', '/passport', '/privacy-controls']
if (!Array.isArray(manifest.criticalRoutes) || manifest.criticalRoutes.length === 0) throw new Error('Critical route manifest is empty')
const routes = [...new Set(manifest.criticalRoutes)]
if (routes.length !== manifest.criticalRoutes.length) throw new Error('Critical route manifest contains duplicate routes')
for (const route of routes) {
  if (typeof route !== 'string' || !/^\/(?:[a-z0-9_-]+(?:\/[a-z0-9_-]+)*)?$/.test(route)) {
    throw new Error(`Critical route is not a static release path: ${String(route)}`)
  }
}

// Retain each route's real initial state as well as these three explicitly
// disclosed samples. No private asset ID, account fixture, or storage seed is used.
const demoQueries = {
  '/life-map': 'demo=1&manifestId=replay-recovery-thread&overview=1',
  '/focus': 'demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread',
  '/replay': 'demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread',
}
const cases = routes.map(route => ({ route, state: 'initial-unsigned', query: '', profile, coverage: 'primary-critical-routes' }))
for (const [route, query] of Object.entries(demoQueries)) {
  if (routes.includes(route)) cases.push({ route, state: 'explicit-demo', query, profile, coverage: 'primary-critical-routes' })
}
const primaryCaptureCount = cases.length
if (group === 'visual') {
  for (const representativeProfile of representativeProfiles) {
    for (const route of representativeRoutes) {
      if (!routes.includes(route)) throw new Error(`Representative route is missing from the critical manifest: ${route}`)
      const query = demoQueries[route] || ''
      cases.push({ route, state: query ? 'explicit-demo' : 'initial-unsigned', query, profile: representativeProfile, coverage: 'representative-tablet-or-wide' })
    }
  }
}
if (new Set(cases.map(spec => `${spec.route}|${spec.state}|${spec.profile.id}`)).size !== cases.length) throw new Error('Route matrix contains duplicate capture identities')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
if (process.argv.includes('--validate-only')) {
  console.log(JSON.stringify({ exactHead, group, profile: profile.id, criticalRoutes: routes.length, primaryCaptureCases: primaryCaptureCount, representativeCaptureCases: cases.length - primaryCaptureCount, captureCases: cases.length, representativeProfiles: group === 'visual' ? representativeProfiles : [], manifestSha256: sha256(manifestBytes), browserLaunched: false }))
  process.exit(0)
}

const base = new URL(process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173')
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
  throw new Error('URAI_PROOF_BASE must be a credential-free HTTP origin')
}
base.pathname = '/'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || path.join(repositoryRoot, `artifacts/continuous-spatial-proof-${group}/launch-route-matrix`))
await mkdir(outputDir, { recursive: true })
const receipt = {
  schemaVersion: 'urai-launch-route-matrix-1',
  exactHead,
  group,
  profile,
  base: base.origin,
  startedAt: new Date().toISOString(),
  manifest: { path: 'release/route-manifest.json', sha256: sha256(manifestBytes), criticalRoutes: routes },
  sourceVerification: { checkoutHead, checkoutMatchesExactHead: true, manifestMatchesExactHead: true },
  scope: {
    authentication: 'fresh-unsigned-context-per-capture',
    initialSession: 'first-entry-in-fresh-context-with-first-run-guides-retained',
    returningSession: 'not-exercised-no-visited-or-onboarding-storage-seeded',
    interactions: 'none',
    privateFixtures: 'none',
    demoRoutes: Object.keys(demoQueries).filter(route => routes.includes(route)),
    personalizedRuntimeVerified: false,
    literalVisualQuality: 'requires-human-image-review',
    deviceAcceptance: 'not-exercised',
    releaseVerdict: 'not-evaluated',
  },
  expectedCaptures: cases.length,
  expectedRouteMatrixCaptures: cases.length,
  expectedPrimaryCaptures: primaryCaptureCount,
  expectedRepresentativeCaptures: cases.length - primaryCaptureCount,
  representativeCoverage: group === 'visual' ? { routes: representativeRoutes, profiles: representativeProfiles } : { routes: [], profiles: [] },
  captures: [],
  errors: [],
}
const receiptPath = path.join(outputDir, 'receipt.json')
async function saveReceipt() {
  await writeFile(`${receiptPath}.tmp`, `${JSON.stringify(receipt, null, 2)}\n`)
  await rename(`${receiptPath}.tmp`, receiptPath)
}
async function saveGallery() {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
  const cards = receipt.captures.map(capture => `<article>
    <h2>${escape(capture.route)}</h2><p>${escape(capture.profile)} · ${escape(capture.requestedState)} · ${escape(capture.observedState || 'unobserved')}</p>
    ${capture.image ? `<a href="${escape(capture.image.path)}"><img src="${escape(capture.image.path)}" alt="${escape(capture.route)} ${escape(capture.profile)} actual browser capture"></a>` : '<p>Image unavailable.</p>'}
    <p>Session: fresh unsigned initial entry · First-run guides: ${capture.dom?.firstRunGuides?.length ? 'visible and retained' : 'not observed in this frame'} · Returning session: not exercised.</p>
    <p>Canvas: ${escape(capture.readiness?.canvasReadiness || 'unobserved')}<br>Source textures: ${escape(capture.readiness?.sourceTextureReadiness || 'unobserved')}</p>
    <p>${capture.technicalDefects.length ? `${capture.technicalDefects.length} technical defects: ${escape(capture.technicalDefects.map(defect => defect.kind).join(', '))}` : 'No listed technical defects. Literal visual quality requires image review.'}</p>
    <details><summary>DOM headings and controls</summary><p>${escape(capture.dom?.visibleHeadingText?.join(' · '))}</p><p>${escape(capture.dom?.controls?.filter(control => control.inViewport).map(control => control.label).filter(Boolean).join(' · '))}</p></details>
  </article>`).join('\n')
  await writeFile(path.join(outputDir, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UrAi route matrix ${escape(group)}</title><style>body{margin:0;background:#08111a;color:#e8eef5;font:15px/1.5 system-ui,sans-serif}header{padding:24px;overflow-wrap:anywhere}a{color:#a4d5ff}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:20px;padding:20px}article{padding:16px;border:1px solid #395062;border-radius:12px;overflow-wrap:anywhere}h2{margin:0}img{width:100%;height:auto;background:#000}details{margin-top:12px}</style><header><h1>UrAi actual route captures · ${escape(group)}</h1><p>Exact checkout ${escape(exactHead)} · ${primaryCaptureCount} primary captures over ${routes.length} critical routes · ${cases.length - primaryCaptureCount} representative tablet/wide captures.</p><p>These images do not certify personalized runtime, literal visual quality, source texture completeness without telemetry, or physical devices. Each route uses a fresh unsigned initial-entry context with no interactions or private fixtures. First-run guides are retained; returning sessions are not exercised.</p><p><a href="receipt.json">Structured receipt, image hashes, DOM bounds, and events</a></p></header><main>${cards}</main></html>\n`)
}
function safeUrl(value) {
  try {
    const url = new URL(value)
    for (const key of url.searchParams.keys()) {
      if (/key|token|auth|signature|credential|secret|session|policy/i.test(key)) url.searchParams.set(key, '[redacted]')
    }
    url.username = ''
    url.password = ''
    return url.href
  } catch { return String(value).slice(0, 1000) }
}
const assetTypes = new Set(['document', 'stylesheet', 'script', 'image', 'font', 'media', 'manifest'])
function isDocumentOrAsset(request) {
  if (assetTypes.has(request.resourceType())) return true
  try {
    const pathname = new URL(request.url()).pathname
    return pathname.startsWith('/assets/') || /\.(?:glb|gltf|bin|ktx2?|hdr|exr|wasm|json|png|jpe?g|webp|avif|svg|mp4|webm|ogg|opus|mp3|wav)(?:$|\/)/i.test(pathname)
  } catch { return false }
}
async function bounded(promise, timeoutMs, label) {
  let timer
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs)
    })])
  } finally { clearTimeout(timer) }
}

// Reading DOM evidence never creates a WebGL context or forces a synthetic
// readiness flag. Missing texture/frame telemetry stays explicitly unverified.
async function inspectDom(page, timeoutMs = 20_000) {
  return bounded(page.evaluate(() => {
    const visible = element => {
      const rect = element.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return false
      for (let current = element; current instanceof Element; current = current.parentElement) {
        const style = getComputedStyle(current)
        if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') <= 0.02) return false
      }
      return true
    }
    const inViewport = element => {
      if (!visible(element)) return false
      const rect = element.getBoundingClientRect()
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
    }
    const bounds = element => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }
    }
    const identity = element => ({ tag: element.tagName.toLowerCase(), id: element.id || null, testId: element.getAttribute('data-testid'), className: String(element.getAttribute('class') || '').slice(0, 180) })
    const mains = [...document.querySelectorAll('main,[role="main"]')].filter(visible)
    const visibleMains = mains.filter(inViewport)
    const stateRoots = [...new Set([...mains, ...document.querySelectorAll('[data-testid],[data-route-owner],[data-spatial-owner],[data-home-assets-ready],[data-life-map-render-ready],[data-renderer-ready],[data-realm-ready],[data-webgl-state],[data-replay-image-state],[data-replay-source-status]')])]
      .filter(visible)
    const owners = stateRoots.slice(0, 180).map(element => ({
      ...identity(element),
      bounds: bounds(element),
      attributes: Object.fromEntries([...element.attributes].filter(attribute => /^data-/.test(attribute.name) && /(state|status|ready|owner|source|mode|renderer|media|texture|asset|neutral)/.test(attribute.name)).map(attribute => [attribute.name, attribute.value])),
    }))
    const readinessNames = new Set(['data-home-assets-ready', 'data-home-ready', 'data-ground-ready', 'data-life-map-render-ready', 'data-renderer-ready', 'data-realm-ready', 'data-webgl-ready', 'data-urai-runtime-ready'])
    const readiness = owners.flatMap(owner => Object.entries(owner.attributes).filter(([name]) => readinessNames.has(name)).map(([name, value]) => ({
      owner: owner.testId || owner.className || owner.tag, name, value,
      applicability: name === 'data-ground-ready' && owner.attributes['data-ground-renderer'] === 'fallback' ? 'explicit-semantic-fallback' : 'render-owner',
    })))
    const stateFields = owners.flatMap(owner => Object.entries(owner.attributes).filter(([name]) => /(?:state|status|source|mode)$/.test(name)).map(([name, value]) => ({ owner: owner.testId || owner.className || owner.tag, name, value })))
    const pendingStates = stateFields.filter(({ name, value }) => ['data-state', 'data-memory-status', 'data-memory-world-state', 'data-chamber-state', 'data-webgl-state', 'data-replay-image-state', 'data-replay-media-state', 'data-replay-source-status'].includes(name) && /^(?:loading|route-loading|auth-loading|restoring|opening|pending|checking)$/.test(value))
    const globalLoading = [...document.querySelectorAll('h1,h2')].some(element => inViewport(element) && /^Opening your world\s*[.…]*$/i.test(element.textContent?.trim() || ''))
    const visibleLoadingText = [...document.querySelectorAll('[role="status"],[aria-busy="true"],.home-runtime-loading')].filter(inViewport).map(element => element.textContent?.trim() || '').filter(text => /^(?:Opening (?:universe|selected memory|Memory World|stellar memory field|memory field|your private captured place)|Preparing stellar memory field|Checking private identity|Checking spatial view)\b/i.test(text)).slice(0, 16)
    const visibleImages = [...document.images].filter(inViewport).map(image => ({ src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, bounds: bounds(image) }))
    const canvases = [...document.querySelectorAll('canvas')].filter(inViewport).map(canvas => ({
      ...identity(canvas), bounds: bounds(canvas), backingWidth: canvas.width, backingHeight: canvas.height,
      attributes: Object.fromEntries([...canvas.attributes].filter(attribute => /^data-/.test(attribute.name)).map(attribute => [attribute.name, attribute.value])),
      readiness: 'unverified-unless-owner-or-canvas-frame-telemetry-is-present',
    }))
    const controls = [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea,summary,[role="button"],[tabindex]')].filter(visible).map(element => ({
      ...identity(element), role: element.getAttribute('role'),
      label: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 160),
      href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
      disabled: 'disabled' in element ? Boolean(element.disabled) : element.getAttribute('aria-disabled') === 'true',
      bounds: bounds(element), inViewport: inViewport(element),
      horizontalOutsideViewport: element.getBoundingClientRect().left < -1 || element.getBoundingClientRect().right > innerWidth + 1,
    }))
    const bodyWidth = document.body?.scrollWidth || 0
    const documentWidth = document.documentElement.scrollWidth
    const horizontalOverflow = Math.max(bodyWidth, documentWidth) - innerWidth
    const overflowingElements = horizontalOverflow > 1
      ? [...document.querySelectorAll('body *')].filter(element => inViewport(element) && (element.getBoundingClientRect().left < -1 || element.getBoundingClientRect().right > innerWidth + 1)).slice(0, 16).map(element => ({ ...identity(element), bounds: bounds(element) }))
      : []
    const mainText = visibleMains.map(main => main.innerText.trim()).join('\n').slice(0, 5000)
    const firstRunGuides = [...document.querySelectorAll('[data-first-run],.uraiV2OnboardingCard')].filter(inViewport).map(element => ({ ...identity(element), mode: element.getAttribute('data-first-run'), label: element.getAttribute('aria-label'), bounds: bounds(element), text: (element.textContent || '').trim().slice(0, 800) }))
    return {
      readyState: document.readyState, title: document.title, mainCount: mains.length, visibleMainCount: visibleMains.length,
      mainText, bodyTextPreview: (document.body?.innerText || '').trim().slice(0, 1600),
      visibleHeadingText: [...document.querySelectorAll('h1,h2,h3')].filter(inViewport).map(element => element.innerText.trim()).filter(Boolean).slice(0, 24),
      firstRunGuides,
      globalLoading, visibleLoadingText, pendingStates, owners, stateFields, readiness,
      fonts: document.fonts?.status || 'unobservable',
      images: visibleImages.slice(0, 80), imageCount: visibleImages.length,
      canvases: canvases.slice(0, 24), canvasCount: canvases.length,
      controls: controls.slice(0, 180), controlCount: controls.length,
      geometry: { viewportWidth: innerWidth, viewportHeight: innerHeight, bodyWidth, documentWidth, horizontalOverflow, overflowingElements },
      performanceMarks: performance.getEntriesByType('mark').filter(mark => mark.name.startsWith('urai:')).map(mark => ({ name: mark.name, atMs: Math.round(mark.startTime) })).slice(0, 80),
      hasVisibleSvg: [...document.querySelectorAll('main svg,[role="main"] svg')].some(inViewport),
    }
  }), timeoutMs, 'DOM inspection')
}

async function inspectDomWithinBudget(page, caseDeadline) {
  const remaining = () => Math.max(1_000, caseDeadline - Date.now())
  try {
    return await inspectDom(page, Math.min(20_000, remaining()))
  } catch (error) {
    const message = String(error)
    const transientInspectionFailure = /DOM inspection exceeded|Execution context was destroyed|Cannot find context with specified id/i.test(message)
    if (!transientInspectionFailure || remaining() < 8_000) throw error

    // Route transitions and heavily loaded GPU pages can invalidate an in-page
    // evaluation context or throttle requestAnimationFrame after the product has
    // already produced valid route/readiness evidence. Reacquire the document
    // context from Playwright itself instead of depending on another page-side
    // frame callback. This does not relax any DOM/readiness assertion.
    await page.waitForLoadState('domcontentloaded', { timeout: Math.min(3_000, remaining()) }).catch(() => {})
    await page.waitForTimeout(Math.min(250, Math.max(1, remaining())))
    return inspectDom(page, Math.min(30_000, remaining()))
  }
}

async function captureViewportScreenshot(page, filePath, caseDeadline) {
  const remaining = () => Math.max(1_000, caseDeadline - Date.now())
  try {
    return {
      buffer: await page.screenshot({
        path: filePath,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        timeout: Math.min(12_000, remaining()),
      }),
      retried: false,
    }
  } catch (error) {
    if (!/Timeout/i.test(String(error)) || remaining() < 5_000) throw error
    // A timed-out GPU screenshot can leave in-page frame callbacks throttled long
    // enough that a requestAnimationFrame-only retry gate fails before the second
    // screenshot is even attempted. Route/font/asset readiness has already been
    // inspected above, so give Chromium a brief runner-side compositor breather
    // without making retry progress depend on page-frame execution.
    await page.waitForTimeout(Math.min(250, Math.max(1, remaining())))
    return {
      buffer: await page.screenshot({
        path: filePath,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        timeout: Math.min(30_000, remaining()),
      }),
      retried: true,
    }
  }
}

function classifyState(spec, dom) {
  if (!dom) return 'unobserved'
  const fields = dom.stateFields.map(field => field.value)
  if (fields.some(value => /unauthenticated|unauthorized|auth-required|sign-in-required|access-denied/.test(value))) return 'authentication-or-access-denied'
  if (fields.some(value => /demo|demonstration/.test(value))) return 'explicit-demo'
  if (spec.state === 'explicit-demo') return 'demo-requested-but-source-state-unconfirmed'
  if (fields.some(value => /neutral|empty|unavailable|no-selected|non-personalized/.test(value))) return 'neutral-or-unavailable'
  return 'unsigned-public-or-undetermined'
}
function readinessEvidence(dom, noWebGL) {
  if (!dom) return { status: 'unobserved', sourceTextureReadiness: 'unobserved', canvasReadiness: 'unobserved' }
  const unsatisfied = dom.readiness.filter(marker => marker.applicability === 'render-owner' && marker.value !== 'true')
  const frameMarkers = dom.canvases.flatMap(canvas => Object.entries(canvas.attributes).filter(([name, value]) => /first-frame|render-ready/.test(name) && value === 'true'))
  const hasCanvasTelemetry = dom.readiness.some(marker => marker.applicability === 'render-owner') || frameMarkers.length > 0
  return {
    status: unsatisfied.length ? 'observable-owner-unsettled' : dom.canvasCount && !hasCanvasTelemetry ? 'canvas-readiness-unverified' : 'observable-checks-settled',
    ownerMarkers: dom.readiness,
    canvasFrameMarkers: frameMarkers,
    canvasReadiness: dom.canvasCount ? hasCanvasTelemetry && !unsatisfied.length ? 'observable-owner-or-frame-marker-settled' : 'unverified' : noWebGL ? 'no-visible-canvas-in-no-webgl-profile' : 'no-visible-canvas',
    sourceTextureReadiness: dom.readiness.some(marker => marker.name === 'data-home-assets-ready' && marker.value === 'true')
      ? 'home-owner-reports-assets-ready' : 'unverified-no-complete-texture-owner-telemetry',
    visibleImages: dom.images.every(image => image.complete && image.naturalWidth > 0) ? 'loaded' : 'unsettled-or-broken',
    interpretation: 'Sized canvases and generic first-frame marks alone do not establish decoded source textures or literal visual quality.',
  }
}

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
let browser
try {
  browser = await chromium.launch({ headless: true })
  for (const spec of cases) {
    const captureProfile = spec.profile
    const id = `${spec.route.split('/').filter(Boolean).join('-') || 'root'}--${spec.state}--${captureProfile.id}`
    const representative = spec.coverage === 'representative-tablet-or-wide'
    const homeCase = ['/', '/home'].includes(spec.route) && !captureProfile.noWebGL
    // The matrix records real GPU-backed browser pixels. Budgets must cover navigation,
    // route stabilization, retained screenshot readback, and context shutdown without
    // treating a slow CI GPU readback as missing product evidence.
    const caseBudgetMs = homeCase ? 130_000 : representative ? 75_000 : 90_000
    const caseDeadline = Date.now() + caseBudgetMs
    const record = { id, exactHead, route: spec.route, requestedState: spec.state, profile: captureProfile.id, profileMetadata: { ...captureProfile, deviceScaleFactor: 1 }, coverage: spec.coverage, sessionState: 'fresh-unsigned-initial-entry', returningSession: 'not-exercised', caseBudgetMs, startedAt: new Date().toISOString(), response: null, finalUrl: null, dom: null, readiness: null, image: null, events: [], eventCount: 0, omittedEvents: 0, technicalDefects: [] }
    receipt.captures.push(record)
    let context
    let page
    let dom
    const pendingAssets = new Set()
    const compatibilityNavigationAborts = []
    const events = event => {
      record.eventCount += 1
      if (record.events.length < 1200) record.events.push({ at: new Date().toISOString(), ...event })
      else record.omittedEvents += 1
    }
    const defect = (kind, details) => { record.technicalDefects.push({ kind, ...details }) }
    try {
      context = await bounded(browser.newContext({ viewport: { width: captureProfile.width, height: captureProfile.height }, isMobile: captureProfile.isMobile, hasTouch: captureProfile.hasTouch, deviceScaleFactor: 1, permissions: [], acceptDownloads: false }), 10_000, 'Context creation')
      if (captureProfile.noWebGL) {
        await context.addInitScript(() => {
          for (const constructor of [HTMLCanvasElement, typeof OffscreenCanvas === 'undefined' ? null : OffscreenCanvas]) {
            if (!constructor) continue
            const originalGetContext = constructor.prototype.getContext
            constructor.prototype.getContext = function (type, ...args) {
              if (/^(webgl2?|experimental-webgl)$/i.test(String(type))) return null
              return Reflect.apply(originalGetContext, this, [type, ...args])
            }
          }
        })
      }
      page = await bounded(context.newPage(), 10_000, 'Page creation')
      page.setDefaultTimeout(10_000)
      page.on('pageerror', error => { events({ type: 'pageerror', message: String(error) }); defect('pageerror', { message: String(error) }) })
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) events({ type: `console-${message.type()}`, message: message.text().slice(0, 2000) }) })
      page.on('request', request => {
        if (isDocumentOrAsset(request)) pendingAssets.add(request)
        events({ type: 'request', method: request.method(), resourceType: request.resourceType(), url: safeUrl(request.url()) })
      })
      page.on('response', response => {
        const request = response.request()
        events({ type: 'response', status: response.status(), resourceType: request.resourceType(), url: safeUrl(response.url()) })
        if (response.status() >= 400 && isDocumentOrAsset(request)) defect('document-or-asset-http-error', { status: response.status(), resourceType: request.resourceType(), url: safeUrl(response.url()) })
      })
      page.on('requestfinished', request => { pendingAssets.delete(request); events({ type: 'requestfinished', resourceType: request.resourceType(), url: safeUrl(request.url()) }) })
      page.on('requestfailed', request => {
        pendingAssets.delete(request)
        const failure = request.failure()?.errorText || 'unknown'
        const requestUrl = safeUrl(request.url())
        events({ type: 'requestfailed', failure, resourceType: request.resourceType(), url: requestUrl })
        if (isDocumentOrAsset(request)) {
          let compatibilityAbort = false
          if (spec.route === '/unwind' && failure === 'net::ERR_ABORTED') {
            try {
              const parsed = new URL(request.url())
              compatibilityAbort = parsed.origin === base.origin && request.method() === 'GET'
            } catch {}
          }
          if (compatibilityAbort) {
            compatibilityNavigationAborts.push({ failure, resourceType: request.resourceType(), url: requestUrl })
            events({ type: 'compatibility-navigation-abort-candidate', failure, resourceType: request.resourceType(), url: requestUrl })
          } else {
            defect('document-or-asset-request-failed', { failure, resourceType: request.resourceType(), url: requestUrl })
          }
        }
      })
      const routePath = spec.route === '/' ? '/' : `${spec.route}/`
      const target = new URL(`${routePath}${spec.query ? `?${spec.query}` : ''}`, base)
      try {
        const response = await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: representative ? 12_000 : 20_000 })
        record.response = response ? { status: response.status(), url: safeUrl(response.url()), contentType: response.headers()['content-type'] || null } : null
        if (!response) defect('missing-document-response', {})
      } catch (error) { defect('navigation-error', { message: String(error) }) }

      const settleBudgetMs = representative ? homeCase ? 32_000 : 20_000 : homeCase ? 60_000 : 25_000
      // Wide Home captures are the heaviest compositor readback in the matrix.
      // Preserve at least 45s of the existing 100s representative case budget
      // for final DOM evidence + a full-resolution screenshot retry. Readiness
      // criteria remain identical; this only prevents the settle loop from
      // consuming the screenshot's time budget after the route is already stable.
      const screenshotReserveMs = representative && homeCase ? 45_000 : 30_000
      const settleDeadline = Math.min(Date.now() + settleBudgetMs, caseDeadline - screenshotReserveMs)
      let stableSamples = 0
      let previousSignature = null
      while (Date.now() < settleDeadline) {
        dom = await inspectDomWithinBudget(page, caseDeadline)
        const signature = JSON.stringify({ text: dom.mainText.slice(0, 800), states: dom.stateFields, readiness: dom.readiness, canvasCount: dom.canvasCount, images: dom.images.map(image => [image.src, image.complete, image.naturalWidth]) })
        const ready = dom.visibleMainCount > 0 && !dom.globalLoading && !dom.pendingStates.length && !dom.visibleLoadingText.length
          && dom.readiness.every(marker => marker.applicability === 'explicit-semantic-fallback' || marker.value === 'true')
          && dom.images.every(image => image.complete && image.naturalWidth > 0)
          && dom.fonts !== 'loading' && pendingAssets.size === 0
        stableSamples = ready && signature === previousSignature ? stableSamples + 1 : 0
        previousSignature = signature
        if (stableSamples >= 3) break
        await page.waitForTimeout(250)
      }
      // A final snapshot is taken even when the route failed to settle.
      dom = await inspectDomWithinBudget(page, caseDeadline)
      record.finalUrl = safeUrl(page.url())
      record.compatibilityNavigationAborts = compatibilityNavigationAborts.map((entry) => ({ ...entry }))
      if (compatibilityNavigationAborts.length) {
        let compatibilityRedirectConfirmed = false
        try {
          const finalUrl = new URL(page.url())
          compatibilityRedirectConfirmed = spec.route === '/unwind'
            && finalUrl.origin === base.origin
            && finalUrl.pathname.replace(/\/+$/, '') === '/life-map'
            && finalUrl.searchParams.get('from') === 'unwind'
            && finalUrl.searchParams.get('overview') === '1'
        } catch {}
        if (compatibilityRedirectConfirmed) {
          events({ type: 'compatibility-navigation-aborts-accepted', route: spec.route, count: compatibilityNavigationAborts.length })
        } else {
          for (const aborted of compatibilityNavigationAborts) {
            defect('document-or-asset-request-failed', aborted)
          }
          defect('unwind-compatibility-redirect-unconfirmed', { finalUrl: record.finalUrl, abortedRequests: compatibilityNavigationAborts.length })
        }
      }
      record.observedState = classifyState(spec, dom)
      record.dom = dom
      record.readiness = readinessEvidence(dom, captureProfile.noWebGL)
      if (dom.globalLoading) defect('unsettled-global-opening-your-world', {})
      if (dom.visibleLoadingText.length) defect('unsettled-visible-source-or-renderer', { messages: dom.visibleLoadingText })
      if (dom.pendingStates.length) defect('unsettled-route-state', { states: dom.pendingStates })
      // A no-WebGL capture intentionally disables the render owner; its semantic fallback is the authoritative owner for that profile.\n      // Do not convert the expected render-owner-unavailable state into a false technical defect.\n      if (!captureProfile.noWebGL && dom.readiness.some(marker => marker.applicability === 'render-owner' && marker.value !== 'true')) defect('unsettled-observable-owner', { markers: dom.readiness.filter(marker => marker.applicability === 'render-owner' && marker.value !== 'true') })
      if (pendingAssets.size) defect('unsettled-document-or-assets', { requests: [...pendingAssets].map(request => ({ url: safeUrl(request.url()), resourceType: request.resourceType() })).slice(0, 32) })
      if (dom.fonts === 'loading') defect('unsettled-fonts', {})
      if (dom.geometry.horizontalOverflow > 1) defect('actual-horizontal-overflow', { pixels: dom.geometry.horizontalOverflow, geometry: dom.geometry })
      if (!dom.visibleMainCount || (!dom.mainText && !dom.canvasCount && !dom.imageCount && !dom.hasVisibleSvg)) defect('empty-route', { visibleMainCount: dom.visibleMainCount })
      if (dom.images.some(image => !image.complete || image.naturalWidth === 0)) defect('visible-image-unsettled-or-broken', { images: dom.images.filter(image => !image.complete || image.naturalWidth === 0) })
      if (dom.canvases.some(canvas => canvas.backingWidth < 1 || canvas.backingHeight < 1)) defect('visible-canvas-without-backing-buffer', {})
      if (spec.state === 'explicit-demo' && record.observedState !== 'explicit-demo') defect('explicit-demo-source-unconfirmed', { observedState: record.observedState })

      const filename = `${id}--${exactHead.slice(0, 12)}.png`
      const captured = await captureViewportScreenshot(page, path.join(outputDir, filename), caseDeadline)
      const screenshot = captured.buffer
      if (captured.retried) events({ type: 'screenshot-retry', reason: 'transient-compositor-timeout' })
      record.image = { path: filename, sha256: sha256(screenshot), bytes: screenshot.length, width: screenshot.readUInt32BE(16), height: screenshot.readUInt32BE(20), profile: captureProfile.id, kind: 'actual-browser-viewport-png', fullPage: false, captureRetried: captured.retried }
      if (record.image.width !== captureProfile.width || record.image.height !== captureProfile.height) defect('actual-viewport-image-size-mismatch', { expectedWidth: captureProfile.width, expectedHeight: captureProfile.height, actualWidth: record.image.width, actualHeight: record.image.height })
    } catch (error) {
      defect('capture-error', { message: String(error) })
      // Keep a failure frame wherever the browser still has a document.
      if (page && !record.image) {
        try {
          const filename = `${id}--${exactHead.slice(0, 12)}--failure.png`
          const screenshot = await page.screenshot({ path: path.join(outputDir, filename), fullPage: false, animations: 'disabled', caret: 'hide', timeout: Math.min(8_000, Math.max(1_000, caseDeadline - Date.now())) })
          record.image = { path: filename, sha256: sha256(screenshot), bytes: screenshot.length, width: screenshot.readUInt32BE(16), height: screenshot.readUInt32BE(20), profile: captureProfile.id, kind: 'actual-browser-failure-viewport-png', fullPage: false }
          record.dom ||= await inspectDomWithinBudget(page, caseDeadline)
          record.finalUrl ||= safeUrl(page.url())
          record.observedState ||= classifyState(spec, record.dom)
          record.readiness ||= readinessEvidence(record.dom, captureProfile.noWebGL)
        } catch (captureError) { events({ type: 'failure-frame-unavailable', message: String(captureError) }) }
      }
    } finally {
      if (context) await bounded(context.close(), 10_000, 'Context closure').catch(error => defect('context-close-error', { message: String(error) }))
      if (Date.now() > caseDeadline) defect('per-case-budget-exceeded', { budgetMs: caseBudgetMs })
      record.finishedAt = new Date().toISOString()
      record.captureOutcome = record.image ? 'recorded' : 'not-recorded'
      for (const item of record.technicalDefects) receipt.errors.push({ id, route: spec.route, profile: captureProfile.id, ...item })
      await saveReceipt()
    }
  }
} catch (error) {
  receipt.errors.push({ kind: 'browser-or-matrix-fatal', message: String(error) })
} finally {
  if (browser) await bounded(browser.close(), 10_000, 'Browser closure').catch(error => receipt.errors.push({ kind: 'browser-close-error', message: String(error) }))
  receipt.finishedAt = new Date().toISOString()
  receipt.summary = {
    expectedCaptures: cases.length,
    expectedPrimaryCaptures: primaryCaptureCount,
    expectedRepresentativeCaptures: cases.length - primaryCaptureCount,
    recordedCaptures: receipt.captures.filter(capture => capture.image).length,
    primaryRecordedCaptures: receipt.captures.filter(capture => capture.coverage === 'primary-critical-routes' && capture.image).length,
    representativeRecordedCaptures: receipt.captures.filter(capture => capture.coverage === 'representative-tablet-or-wide' && capture.image).length,
    criticalRoutesAttempted: new Set(receipt.captures.filter(capture => capture.coverage === 'primary-critical-routes' && capture.requestedState === 'initial-unsigned').map(capture => capture.route)).size,
    technicalDefects: receipt.errors.length,
    canvasReadinessUnverified: receipt.captures.filter(capture => capture.readiness?.canvasReadiness === 'unverified').map(capture => capture.id),
    sourceTextureReadinessUnverified: receipt.captures.filter(capture => capture.readiness?.sourceTextureReadiness?.startsWith('unverified')).map(capture => capture.id),
    literalVisualQuality: 'not-certified',
  }
  if (receipt.summary.recordedCaptures !== cases.length) receipt.errors.push({ kind: 'incomplete-image-matrix', expected: cases.length, actual: receipt.summary.recordedCaptures })
  // Emit compact machine-readable defect details so failed proof runs are diagnosable from CI logs.
  if (receipt.errors.length) console.log(JSON.stringify({ exactHead, group, defectSummary: receipt.errors.map(error => ({ id: error.id, route: error.route, profile: error.profile, kind: error.kind, status: error.status, failure: error.failure, message: error.message, pixels: error.pixels })) }))
  if (receipt.summary.criticalRoutesAttempted !== routes.length) receipt.errors.push({ kind: 'incomplete-critical-route-matrix', expected: routes.length, actual: receipt.summary.criticalRoutesAttempted })
  receipt.summary.technicalDefects = receipt.errors.length
  await saveReceipt()
  await saveGallery()
}
console.log(JSON.stringify({ exactHead, group, profile: profile.id, captures: receipt.summary.recordedCaptures, expectedCaptures: cases.length, primaryCaptures: primaryCaptureCount, representativeCaptures: cases.length - primaryCaptureCount, technicalDefects: receipt.errors.length, receipt: path.relative(repositoryRoot, receiptPath), literalVisualQuality: 'not-certified' }))
if (receipt.errors.length) process.exitCode = 1
