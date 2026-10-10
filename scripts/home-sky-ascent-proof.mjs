import assert from 'node:assert/strict'

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
async function waitAttribute(locator, name, expected, timeout = 45_000) {
  const started = Date.now()
  let last = null
  while (Date.now() - started < timeout) {
    // Read the live attribute in one browser round-trip. A count()+getAttribute()
    // sequence can time out under a constrained software renderer even while the
    // attribute is true; that is an observation failure, not a camera failure.
    try { last = await locator.evaluateAll((nodes, name) => nodes[0]?.getAttribute(name) ?? null, name); if (last === expected) return } catch {}
    await pause(Math.min(100, Math.max(0, timeout - (Date.now() - started))))
  }
  throw new Error(`timeout waiting for ${name}=${expected}; lastValue=${JSON.stringify(last)}`)
}

function proofUrl(value) {
  try {
    const url = new URL(value)
    const query = new URLSearchParams()
    for (const key of ['demo','from','entryPortal','cameraCheckpoint']) for (const part of url.searchParams.getAll(key)) query.append(key, part)
    return `${url.origin}${url.pathname}${query.size ? '?' + query : ''}`
  } catch { return 'unavailable' }
}

export function assertHomeAscentArrival(startingUrl, arrivalUrl) {
  const starting = new URL(startingUrl), arrived = new URL(arrivalUrl)
  assert.ok(starting.protocol === 'http:' || starting.protocol === 'https:')
  assert.equal(arrived.origin, starting.origin, 'Ascent arrival left its starting origin')
  assert.equal(arrived.protocol, starting.protocol)
  assert.equal(arrived.username, '')
  assert.equal(arrived.password, '')
  assert.equal(arrived.hash, '')
  assert.equal(arrived.pathname.replace(/\/+$/, ''), '/life-map', 'real Ascent did not arrive in Life Map')
  assert.deepEqual(arrived.searchParams.getAll('from'), ['home-sky'])
  assert.deepEqual(arrived.searchParams.getAll('entryPortal'), ['home-sky'])
  assert.deepEqual(arrived.searchParams.getAll('cameraCheckpoint'), ['home-sky-ascent-complete'])
  const startDemo = starting.searchParams.getAll('demo')
  const disclosedDemo = startDemo.length === 1 && startDemo[0] === '1'
  assert.deepEqual(arrived.searchParams.getAll('demo'), disclosedDemo ? ['1'] : [], 'real Ascent changed explicitly disclosed demo authority')
  assert.deepEqual([...arrived.searchParams.keys()].sort(), [...['from','entryPortal','cameraCheckpoint'], ...(disclosedDemo ? ['demo'] : [])].sort(), 'real Ascent carried unexpected or duplicate query authority')
}

export async function proveHomeSkyAscent(page, home, { mode = 'pointer', captureAscent } = {}) {
  const startingUrl = new URL(page.url())
  const startDemo = startingUrl.searchParams.getAll('demo')
  const disclosedDemo = startDemo.length === 1 && startDemo[0] === '1'
  const key = '__uraiLiteralHomeAscentProof'
  let startingHeight = null
  let samples = []
  try {
  // These are actual current scene/rig fields, not retired Avatar/SKY_ASCENT
  // presentation aliases. The screenshot caller retains literal bodyless review.
  await waitAttribute(home, 'data-home-scene-phase', 'HOME')
  await waitAttribute(home, 'data-home-camera-mode', 'embodied-first-person')
  await waitAttribute(home, 'data-home-input-locked', 'false')
  assert.equal(await home.evaluateAll(nodes => nodes.length === 1 ? nodes[0].getAttribute('data-home-embodied-self') : null), 'privacy-preserving-shadow')
  assert.equal(await page.getByTestId('urai-home-avatar-enter-first-person').count(), 0, 'superseded Avatar activation gate must not exist in ordinary Home')
  const canvas = home.locator('canvas').first()
  await canvas.waitFor({ state:'visible', timeout:45_000 })
  const box = await canvas.evaluateAll(nodes => {
    if (nodes.length !== 1) return null
    const rect = nodes[0].getBoundingClientRect()
    return {x:rect.x,y:rect.y,width:rect.width,height:rect.height}
  })
  assert.ok(box && box.width > 200 && box.height > 200, 'Home canvas must expose broad visible-sky interaction')
  startingHeight = await home.evaluateAll(nodes => nodes.length === 1 ? Number(nodes[0].getAttribute('data-home-camera-height')) : NaN)
  assert.ok(Number.isFinite(startingHeight) && startingHeight > 0, 'actual PlayerRig camera height must be available')

  await home.evaluateAll((nodes, key) => {
    if (nodes.length !== 1) throw new Error('Ascent observation requires exactly one actual Home owner')
    const node=nodes[0]
    window[key]?.observer?.disconnect()
    const state = { samples:[], observer:null }
    const sample = () => {
      const row = {
        phase:node.getAttribute('data-home-scene-phase'), cameraMode:node.getAttribute('data-home-camera-mode'),
        inputLocked:node.getAttribute('data-home-input-locked'), sequence:node.getAttribute('data-home-portal-sequence'),
        height:Number(node.getAttribute('data-home-camera-height')), progress:Number(node.getAttribute('data-home-ascent-progress')),
      }
      if (state.samples.length < 512) state.samples.push(row)
    }
    state.observer = new MutationObserver(sample)
    state.observer.observe(node, { attributes:true, attributeFilter:['data-home-scene-phase','data-home-camera-mode','data-home-input-locked','data-home-portal-sequence','data-home-camera-height','data-home-ascent-progress'] })
    window[key] = state
    sample()
  }, key)

    let activated = false
    // No selector/nav bypass: these are upper-sky pixels of the real Canvas.
    for (const [x,y] of [[.50,.12],[.36,.15],[.64,.15],[.50,.22]]) {
      const absolute = { x:box.x + box.width*x, y:box.y + box.height*y }
      if (mode === 'touch') await page.touchscreen.tap(absolute.x, absolute.y)
      else await page.mouse.click(absolute.x, absolute.y)
      try { await waitAttribute(home, 'data-home-scene-phase', 'ASCENT', 2_500); activated = true; break } catch {}
    }
    assert.equal(activated, true, 'real broad visible-sky interaction did not enter ASCENT')
    await page.waitForFunction(({key,startingHeight}) => {
      const rows = window[key]?.samples ?? []
      return rows.some(row => row.phase === 'ASCENT' && (row.sequence === 'life-map:opening' || row.sequence === 'life-map:traversal'))
        && rows.some(row => row.phase === 'ASCENT' && row.cameraMode === 'ascent' && row.inputLocked === 'true'
          && Number.isFinite(row.height) && row.height > startingHeight + .1 && Number.isFinite(row.progress) && row.progress > 0 && row.progress <= 1)
    }, {key,startingHeight}, {timeout:45_000})
    samples = await page.evaluate(key => window[key]?.samples ?? [], key)
    assert.ok(samples.some(row => row.phase === 'ASCENT' && row.cameraMode === 'ascent' && row.inputLocked === 'true' && Number.isFinite(row.height) && row.height > startingHeight + .1 && Number.isFinite(row.progress) && row.progress > 0 && row.progress <= 1), 'Ascent must physically lift the actual camera')
    if (captureAscent) await captureAscent()
    const started = Date.now()
    while ((new URL(page.url()).pathname.replace(/\/+$/, '') || '/') !== '/life-map' && Date.now() - started < 60_000) await pause(100)
    const arrived = new URL(page.url())
    assertHomeAscentArrival(startingUrl.href, arrived.href)
    return { ascentProven:true, startingHeight, peakHeight:Math.max(...samples.filter(row => Number.isFinite(row.height)).map(row => row.height)), samples, arrivalUrl:proofUrl(page.url()), disclosedDemo }
  } catch (error) {
    const observed = await page.evaluate(key => window[key]?.samples ?? [], key).catch(() => [])
    if (observed.length) samples = observed
    const failure = error instanceof Error ? error : new Error(String(error))
    failure.proof = { ascentProven:false, startingHeight, samples, initialUrl:proofUrl(startingUrl.href), currentUrl:proofUrl(page.url()), disclosedDemo }
    throw failure
  } finally {
    await page.evaluate(key => { window[key]?.observer?.disconnect(); delete window[key] }, key).catch(() => {})
  }
}
