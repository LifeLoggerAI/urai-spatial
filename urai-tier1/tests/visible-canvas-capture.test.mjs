import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { CANVAS_EVIDENCE_SAMPLE_POINTS, captureVisibleCanvasPng } from '../../scripts/capture-visible-canvas-png.mjs'

const ts = createRequire(import.meta.url)('typescript')

const visibleBounds = { x: 12, y: 18, width: 800, height: 600 }
function fixture(bounds = visibleBounds, after = bounds) {
  let reads = 0
  const calls = []
  const pixels = Buffer.from('unmodified-browser-png')
  const canvas = {
    waitFor: async (options) => calls.push(['visible', options]),
    boundingBox: async () => (++reads === 1 ? bounds : after),
    evaluate: async (_read, points) => { calls.push(['occlusion', points]); return true },
    screenshot: () => { throw new Error('Locator screenshot must not wait for frame stability') },
  }
  const page = {
    viewportSize: () => ({ width: 1024, height: 768 }),
    screenshot: async (options) => { calls.push(['screenshot', options]); return pixels },
  }
  return { page, canvas, calls, pixels }
}

test('capture returns untouched pixels and exact canvas crop with a bounded screenshot request', async () => {
  const f = fixture()
  const result = await captureVisibleCanvasPng(f.page, f.canvas, 5000)
  assert.equal(result.buffer, f.pixels)
  assert.equal(result.capture.source, 'visible-canvas-viewport-clip')
  assert.deepEqual(result.capture.clip, visibleBounds)
  assert.equal(result.capture.boundsUnchanged, true)
  assert.equal(result.capture.canvasTopmostAtSamplePoints, true)
  assert.deepEqual(f.calls.find(([name]) => name === 'occlusion')[1], CANVAS_EVIDENCE_SAMPLE_POINTS)
  assert.equal(result.capture.viewportCoverage, 800 * 600 / (1024 * 768))
  const screenshots = f.calls.filter(([name]) => name === 'screenshot')
  assert.equal(screenshots.length, 1)
  assert.deepEqual(screenshots[0][1].clip, visibleBounds)
  assert.equal(screenshots[0][1].fullPage, false)
  assert.equal(screenshots[0][1].type, 'png')
  assert.ok(screenshots[0][1].timeout > 0 && screenshots[0][1].timeout <= 5000)
})


test('canvas validation and post-capture checks retain separate bounded budgets', async () => {
  const f = fixture()
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  let reads = 0
  f.canvas.evaluate = async (_read, points) => {
    f.calls.push(['occlusion', points])
    await wait(45)
    reads += 1
    return true
  }
  f.page.screenshot = async options => {
    f.calls.push(['screenshot', options])
    await wait(45)
    return f.pixels
  }
  const result = await captureVisibleCanvasPng(f.page, f.canvas, 150)
  assert.equal(result.buffer, f.pixels)
  assert.equal(reads, 2)
  const screenshot = f.calls.find(([name]) => name === 'screenshot')[1]
  assert.equal(screenshot.timeout, 150, 'screenshot must receive its own bounded capture allowance')
  assert.equal(result.capture.canvasTopmostAfterCapture, true)
})

test('missing, invalid, and partially clipped canvas bounds fail before any screenshot', async () => {
  for (const bounds of [null, { ...visibleBounds, width: 0 }, { ...visibleBounds, x: NaN }, { ...visibleBounds, x: -1 }, { ...visibleBounds, width: 1200 }]) {
    const f = fixture(bounds)
    await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas))
    assert.equal(f.calls.some(([name]) => name === 'screenshot'), false)
  }
})

test('a canvas that moves during capture fails instead of returning unbound pixels', async () => {
  const f = fixture(visibleBounds, { ...visibleBounds, x: visibleBounds.x + 1 })
  await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas), /bounds changed/)
})

test('an overlay at a sampled pixel rejects the capture before screenshot', async () => {
  const f = fixture()
  f.canvas.evaluate = async () => false
  await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas), /covered/)
  assert.equal(f.calls.some(([name]) => name === 'screenshot'), false)
})


test('nonfinite, zero and unbounded capture budgets fail before any screenshot', async () => {
  for (const budget of [0, -1, Infinity, NaN, 90001]) {
    const f = fixture()
    await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas, budget), /finite deadline/)
    assert.equal(f.calls.some(([name]) => name === 'screenshot'), false)
  }
})

test('overlay appearing during capture rejects otherwise stable retained pixels', async () => {
  const f = fixture()
  let reads = 0
  f.canvas.evaluate = async () => ++reads === 1
  await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas), /became covered/)
  assert.equal(f.calls.filter(([name]) => name === 'screenshot').length, 1)
})

test('Home/Orb proof binds its visual samples and receipt to guarded canvas pixels', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('proof.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const captureImport = ast.statements.find(node => ts.isImportDeclaration(node)
    && node.moduleSpecifier.text === './capture-visible-canvas-png.mjs')
  assert.deepEqual(captureImport?.importClause?.namedBindings?.elements.map(node => node.name.text).sort(),
    ['CANVAS_EVIDENCE_SAMPLE_POINTS', 'captureVisibleCanvasPng'])
  const calls = []
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'captureVisibleCanvasPng') calls.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].arguments.map(node => node.getText(ast)), ['page', 'canvas', '90_000', 'samplePoints'])
  const helperSource = await readFile(new URL('../../scripts/capture-visible-canvas-png.mjs', import.meta.url), 'utf8')
  const helperAst = ts.createSourceFile('capture.mjs', helperSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const helper = helperAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'captureVisibleCanvasPng')
  assert.equal(Number(helper.parameters[2].initializer.text), 90_000)
  assert.equal(helper.parameters[3].initializer.text, 'CANVAS_EVIDENCE_SAMPLE_POINTS')
  assert.match(source, /record\.canvasSamplingBefore = await worldCanvas\.evaluate\(inspectHomeOrbCanvasSamples, CANVAS_EVIDENCE_SAMPLE_POINTS\)/)
  assert.match(source, /if \(!record\.canvasSamplingBefore\.accepted\) throw/)
  assert.match(source, /imageEvidence\(page, worldCanvas, record\.canvasSamplingBefore\.samplePoints\)/)
  assert.match(source, /!record\.canvasSamplingAfter\.accepted \|\| JSON\.stringify\(record\.canvasSamplingAfter\) !== JSON\.stringify\(record\.canvasSamplingBefore\)/)
  assert.match(source, /record\.canvasCapture = visual\.capture/)
  assert.match(source, /record\.canvasCapture\?\.canvasTopmostAfterCapture === true/)
  assert.match(source, /if \(await worldCanvas\.count\(\) !== 1\)/)
})

test('Home/Orb image sampler executes the shared guarded capture with the admitted points and unchanged deadline', async () => {
  const source = await readFile(new URL('../../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('proof.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const sampler = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'imageEvidence')
  assert.ok(sampler)
  // Inert browser/PNG decode boundary; this tests capture wiring, not rendered pixels.
  const f = fixture()
  const points = CANVAS_EVIDENCE_SAMPLE_POINTS.slice(0, -1)
  let captureCalls = 0
  f.page.evaluate = async (_decode, input) => {
    assert.equal(input.url, `data:image/png;base64,${f.pixels.toString('base64')}`)
    assert.equal(input.points, points)
    return { luminanceRange: 32, visibleSamples: points.length }
  }
  const run = vm.runInNewContext(`${sampler.getText(ast)}\nimageEvidence`, {
    captureVisibleCanvasPng: async (page, canvas, timeout, selected) => {
      captureCalls += 1
      assert.equal(page, f.page)
      assert.equal(canvas, f.canvas)
      assert.equal(timeout, 90_000)
      assert.equal(selected, points)
      return captureVisibleCanvasPng(page, canvas, timeout, selected)
    },
  })
  const result = await run(f.page, f.canvas, points)
  assert.equal(captureCalls, 1)
  assert.equal(result.buffer, f.pixels)
  assert.deepEqual(result.capture.samplePoints, points)
  assert.deepEqual(f.calls.filter(([name]) => name === 'occlusion').map(([, selected]) => selected), [points, points])
  assert.equal(result.capture.canvasTopmostAfterCapture, true)
})

const homePoints = [[.18,.2],[.5,.2],[.82,.2],[.18,.5],[.5,.5],[.82,.5],[.18,.8],[.5,.8],[.82,.8]]
test('caller-specific sampling points are guarded before and after capture', async () => {
  const f = fixture()
  const result = await captureVisibleCanvasPng(f.page, f.canvas, 5000, homePoints)
  assert.deepEqual(result.capture.samplePoints, homePoints)
  assert.deepEqual(f.calls.filter(([name]) => name === 'occlusion').map(([, points]) => points), [homePoints, homePoints])
})
test('invalid or unbounded sampling point sets are refused before screenshot', async () => {
  for (const points of [[], [[NaN,.5]], [[-.1,.5]], [[.5,1.1]], [[.5]], Array(65).fill([.5,.5])]) {
    const f = fixture()
    await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas, 5000, points), /sampling points/)
    assert.equal(f.calls.some(([name]) => name === 'screenshot'), false)
  }
})

// Execute the actual Home sampler body and actual shared capture helper.
// Browser/PNG-decode boundaries are inert fixtures; these tests certify no
// rendered scene, screenshot pixels, provider, account or physical device.
async function homeSamplerFixture(options = {}) {
  const source = await readFile(new URL('../../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')
  const start = source.indexOf('async function readVisualEvidence(page)')
  const end = source.indexOf('async function waitForVisualEvidence(', start)
  assert.ok(start >= 0 && end > start)
  const directory = await mkdtemp(path.join(tmpdir(), 'urai-home-sampler-'))
  const bounds = options.bounds ?? { x: 0, y: 0, width: 1440, height: 900 }
  const f = fixture(bounds, options.after ?? bounds)
  f.canvas.count = async () => options.canvasCount ?? 1
  f.canvas.first = () => f.canvas
  f.page.locator = () => f.canvas
  f.page.viewportSize = () => ({ width: 1440, height: 900 })
  let occlusionReads = 0
  f.canvas.evaluate = async (_read, points) => {
    f.calls.push(['occlusion', points]); occlusionReads += 1
    return options.occluded !== true && !(options.coveredAfter === true && occlusionReads > 1)
  }
  const environment = {
    Buffer, createHash, writeFile, path, captureVisibleCanvasPng,
    exactHead: 'a'.repeat(40), outputDir: directory,
    HOME_CANVAS_SAMPLE_POINTS: homePoints,
    MAX_CANVAS_EVIDENCE_FILES: 64,
    canvasEvidenceCount: options.priorCaptures ?? 0,
    Image: class {
      naturalWidth = 1440; naturalHeight = 900
      set src(value) { f.calls.push(['decoded-png', value]); queueMicrotask(() => this.onload()) }
    },
    document: { createElement(kind) {
      assert.equal(kind, 'canvas')
      return { width: 0, height: 0, getContext() { return {
        drawImage() {}, getImageData(x) {
          const luminance = 40 + Math.round(x / 20)
          return { data: Uint8ClampedArray.from([luminance,luminance,luminance,255]) }
        },
      } } }
    } },
  }
  f.page.evaluate = async (read, argument) => argument === undefined ? bounds : read(argument)
  const context = vm.createContext(environment)
  const run = vm.runInContext(source.slice(start, end) + '\nreadVisualEvidence', context)
  return { ...f, directory, context, async run() { return run(f.page) }, async close() { await rm(directory, { recursive: true, force: true }) } }
}

test('Home sampler retains exact guarded PNG bytes, hash and its nine sampling points', async () => {
  const f = await homeSamplerFixture()
  try {
    const result = await f.run()
    assert.equal(result.available, true)
    assert.equal(result.viewportCoverage, 1)
    assert.equal(result.luminance.length, 9)
    assert.ok(result.luminanceRange >= 12)
    assert.ok(result.visibleSamples >= 3)
    assert.equal(result.capture.canvasTopmostAfterCapture, true)
    assert.equal(result.capture.boundsUnchanged, true)
    assert.deepEqual(result.capture.samplePoints, homePoints)
    const saved = await readFile(path.join(f.directory, result.canvasPngFile))
    assert.deepEqual(saved, f.pixels)
    assert.equal(result.canvasPngSha256, createHash('sha256').update(saved).digest('hex'))
    assert.equal(result.canvasPngBytes, saved.length)
    assert.equal(f.context.canvasEvidenceCount, 1)
    assert.deepEqual(f.calls.filter(([name]) => name === 'occlusion').map(([, points]) => points), [homePoints, homePoints])
  } finally { await f.close() }
})
test('Home sampler refuses absent or ambiguous world canvases before screenshot', async () => {
  for (const canvasCount of [0, 2]) {
    const f = await homeSamplerFixture({ canvasCount })
    try { await assert.rejects(f.run(), /exactly one/); assert.equal(f.calls.some(([name]) => name === 'screenshot'), false) }
    finally { await f.close() }
  }
})
test('Home sampler rejects partial viewport crops and nonfinite bounds', async () => {
  for (const bounds of [{x:-1,y:0,width:1440,height:900}, {x:0,y:0,width:1441,height:900}, {x:NaN,y:0,width:1440,height:900}]) {
    const f = await homeSamplerFixture({ bounds })
    try { await assert.rejects(f.run()); assert.equal(f.calls.some(([name]) => name === 'screenshot'), false) }
    finally { await f.close() }
  }
})
test('Home sampler rejects initially occluded or newly covered capture samples', async () => {
  for (const options of [{occluded:true}, {coveredAfter:true}]) {
    const f = await homeSamplerFixture(options)
    try { await assert.rejects(f.run(), /covered/) }
    finally { await f.close() }
  }
})
test('Home sampler rejects canvas drift during screenshot', async () => {
  const f = await homeSamplerFixture({ after: {x:1,y:0,width:1440,height:900} })
  try { await assert.rejects(f.run(), /bounds changed/) }
  finally { await f.close() }
})
test('Home sampler enforces a finite retained-image count before screenshot', async () => {
  const f = await homeSamplerFixture({ priorCaptures:64 })
  try { await assert.rejects(f.run(), /image budget/); assert.equal(f.calls.some(([name]) => name === 'screenshot'), false) }
  finally { await f.close() }
})
