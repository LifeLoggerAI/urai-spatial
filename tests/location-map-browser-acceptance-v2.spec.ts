import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

const route = '/location-map/?privacyMode=private&entryPortal=location-beacon&cameraCheckpoint=atlas-world-view'

type Evidence = { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] }
type ScreenPoint = { x: number; y: number }

function monitor(page: Page): Evidence {
  const evidence: Evidence = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on('console', message => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()) })
  page.on('pageerror', error => evidence.pageErrors.push(error.message))
  page.on('requestfailed', request => evidence.failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`))
  return evidence
}

function isExpectedNavigationAbort(request: string) {
  return request.includes('net::ERR_ABORTED') && (
    request.includes('/location-map?')
    || request.includes('/location-map/?')
    || request.includes('/_next/static/css/app/location-map/')
  )
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, { body: Buffer.from(JSON.stringify(value, null, 2)), contentType: 'application/json' })
}

async function camera(page: Page) {
  return page.locator('.locationAtlas').evaluate(element => ({
    x: getComputedStyle(element).getPropertyValue('--atlas-x').trim(),
    y: getComputedStyle(element).getPropertyValue('--atlas-y').trim(),
    zoom: Number(getComputedStyle(element).getPropertyValue('--atlas-zoom')),
  }))
}

async function cameraTransform(page: Page) {
  return page.locator('.locationAtlasBeacons').evaluate(element => getComputedStyle(element).transform)
}

async function openDemo(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('urai:userId')
    localStorage.removeItem('urai:locationMapDemoMode')
  })
  await page.goto(route, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Your places stay closed until you open them.' })).toBeVisible()
  await page.getByRole('button', { name: 'Open disclosed sample' }).click()
  await expect(page.locator('[data-location-map-source="disclosed-demo"]')).toBeVisible()
}

async function gestureAnchor(page: Page): Promise<ScreenPoint> {
  const box = await page.locator('.locationAtlasStage').boundingBox()
  expect(box).not.toBeNull()
  const candidates = [
    { x: box!.x + box!.width * .50, y: box!.y + box!.height * .50 },
    { x: box!.x + box!.width * .30, y: box!.y + box!.height * .42 },
    { x: box!.x + box!.width * .70, y: box!.y + box!.height * .42 },
    { x: box!.x + box!.width * .50, y: box!.y + box!.height * .68 },
  ]
  for (const candidate of candidates) {
    const blocked = await page.evaluate(({ x, y }) => {
      const node = document.elementFromPoint(x, y)
      return Boolean(node instanceof HTMLElement && node.closest('button,a,[data-atlas-panel]'))
    }, candidate)
    if (!blocked) return candidate
  }
  throw new Error('No unobstructed native gesture anchor was available in the Location Map stage')
}

async function nativeTouchTap(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  expect(box).not.toBeNull()
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  const x = box!.x + box!.width * .5
  const y = box!.y + box!.height * .5
  expect(x).toBeGreaterThanOrEqual(0)
  expect(y).toBeGreaterThanOrEqual(0)
  expect(x).toBeLessThan(viewport!.width)
  expect(y).toBeLessThan(viewport!.height)
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await cdp.send('Input.synthesizeTapGesture', {
      x,
      y,
      duration: 80,
      tapCount: 1,
      gestureSourceType: 'touch',
    })
  } finally {
    await cdp.detach()
  }
}

async function dispatchPointerDrag(page: Page, pointerType: 'mouse' | 'touch', dx: number, dy: number) {
  const { x, y } = await gestureAnchor(page)
  if (pointerType === 'mouse') {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 8 })
    await page.mouse.up()
    return
  }

  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] })
    for (let step = 1; step <= 8; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * step) / 8, y: y + (dy * step) / 8, id: 1, radiusX: 6, radiusY: 6, force: 1 }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}

async function nativePinch(page: Page) {
  const anchor = await gestureAnchor(page)
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: anchor.x - 34, y: anchor.y, id: 1, radiusX: 6, radiusY: 6, force: 1 },
        { x: anchor.x + 34, y: anchor.y, id: 2, radiusX: 6, radiusY: 6, force: 1 },
      ],
    })
    for (let step = 1; step <= 8; step += 1) {
      const spread = 34 + step * 5
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: anchor.x - spread, y: anchor.y, id: 1, radiusX: 6, radiusY: 6, force: 1 },
          { x: anchor.x + spread, y: anchor.y, id: 2, radiusX: 6, radiusY: 6, force: 1 },
        ],
      })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}

async function realWheelZoom(page: Page) {
  const { x, y } = await gestureAnchor(page)
  await page.mouse.move(x, y)
  await page.mouse.wheel(0, -520)
}

test.describe('Location Map exact-head browser acceptance evidence v2', () => {
  test('desktop complete acceptance packet', async ({ page, context }, testInfo) => {
    test.setTimeout(120_000)
    const errors = monitor(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-private-memory-mounted="false"]')).toBeVisible()
    await expect(page.getByText('No personal place history is mounted while signed out.')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('signed-out-desktop.png'), fullPage: true })

    await openDemo(page)
    const atlas = page.locator('[data-location-map-source="disclosed-demo"]')
    const stage = page.locator('.locationAtlasStage')
    const beacons = page.locator('.locationAtlasBeacon')
    expect(await beacons.count()).toBeGreaterThan(0)
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-standard-overview.png'), fullPage: true })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({ path: testInfo.outputPath('demo-desktop-wide-overview.png'), fullPage: true })
    await page.setViewportSize({ width: 1440, height: 900 })

    const beforePan = await camera(page)
    const beforePanTransform = await cam²È="24€€Á…•ÉÉ½ÉÌè•ÉÉ½ÉÌ¹Á…•ÉÉ½ÉÌ¹±•¹Ñ °(€€€€€™…¥±•‘I•ÅÕ•ÍÑÌè•ÉÉ½ÉÌ¹™…¥±•‘I•ÅÕ•ÍÑÌ¹±•¹Ñ °(€€€ô((€€€…Ý…¥ÐÁ…”¹•µÕ±…Ñ•5•‘¥„¡ìÉ•‘Õ•‘5½Ñ¥½¸è€É•‘Õ”œô¤(€€€…Ý…¥Ð•áÁ•Ð¡Á…”¹±½…Ñ½È œ¹±½…Ñ¥½¹Ñ±…Ìœ¤¤¹Ñ½!…Ù•ÑÑÉ¥‰ÕÑ” ‘…Ñ„µÉ•‘Õ•µµ½Ñ¥½¸œ°€ÑÉÕ”œ¤(€€€½¹ÍÐµ½Ñ¥½¹MÑå±•Ì€ô…Ý…¥ÐÁ…”¹±½…Ñ½È œ¹±½…Ñ¥½¹Ñ±…Í	•…½¸°€¹±½…Ñ¥½¹Ñ±…ÍM•±•Ñ¥½¸°€¹±½…Ñ¥½¹Ñ±…Í	•…½¹Ìœ¤¹•Ù…±Õ…Ñ•±°¡•±•µ•¹ÑÌ€ôø•±•µ•¹ÑÌ¹µ…À¡•±•µ•¹Ð€ôø€¡ì(€€€€€ÑÉ…¹Í¥Ñ¥½¹ÕÉ…Ñ¥½¸è•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹ÑÉ…¹Í¥Ñ¥½¹ÕÉ…Ñ¥½¸°(€€€€€…¹¥µ…Ñ¥½¹ÕÉ…Ñ¥½¸è•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹…¹¥µ…Ñ¥½¹ÕÉ…Ñ¥½¸°(€€€ô¤¤¤(€€€•áÁ•Ð¡µ½Ñ¥½¹MÑå±•Ì¹•Ù•Éä¡ÍÑå±”€ôøÍÑå±”¹ÑÉ…¹Í¥Ñ¥½¹ÕÉ…Ñ¥½¸¹ÍÁ±¥Ð œ°œ¤¹•Ù•Éä¡Ù…±Õ”€ôøÙ…±Õ”¹ÑÉ¥´ ¤€ôôô€œÁÌœ¤€˜˜ÍÑå±”¹…¹¥µ…Ñ¥½¹ÕÉ…Ñ¥½¸¹ÍÁ±¥Ð œ°œ¤¹•Ù•Éä¡Ù…±Õ”€ôøÙ…±Õ”¹ÑÉ¥´ ¤€ôôô€œÁÌœ¤¤¤¹Ñ½	”¡ÑÉÕ”¤(€€€…Ý…¥ÐÁ…”¹ÍÉ••¹Í¡½Ð¡ìÁ…Ñ èÑ•ÍÑ%¹™¼¹½ÕÑÁÕÑA…Ñ  É•‘Õ•µµ½Ñ¥½¸µ‘•Í­Ñ½À¹Á¹œœ¤°™Õ±±A…”èÑÉÕ”ô¤((€€€½¹ÍÐ½™™±¥¹•½¹Í½±•ÉÉ½ÉÌ€ô•ÉÉ½ÉÌ¹½¹Í½±•ÉÉ½ÉÌ¹Í±¥”¡½™™±¥¹•MÑ…ÉÐ¹½¹Í½±•ÉÉ½ÉÌ°½™™±¥¹•¹¹½¹Í½±•ÉÉ½ÉÌ¤(€€€½¹ÍÐ½™™±¥¹•A…•ÉÉ½ÉÌ€ô•ÉÉ½ÉÌ¹Á…•ÉÉ½ÉÌ¹Í±¥”¡½™™±¥¹•MÑ…ÉÐ¹Á…•ÉÉ½ÉÌ°½™™±¥¹•¹¹Á…•ÉÉ½ÉÌ¤(€€€½¹ÍÐ½™™±¥¹•I•ÅÕ•ÍÑÌ€ô•ÉÉ½ÉÌ¹™…¥±•‘I•ÅÕ•ÍÑÌ¹Í±¥”¡½™™±¥¹•MÑ…ÉÐ¹™…¥±•‘I•ÅÕ•ÍÑÌ°½™™±¥¹•¹¹™…¥±•‘I•ÅÕ•ÍÑÌ¤(€€€½¹ÍÐ•áÁ•Ñ•‘=™™±¥¹•½¹Í½±•ÉÉ½ÉÌ€ô½™™±¥¹•½¹Í½±•ÉÉ½ÉÌ¹™¥±Ñ•È¡µ•ÍÍ…”€ôøµ•ÍÍ…”¹¥¹±Õ‘•Ì II}%9QI9Q}%M=99Qœ¤¤(€€€½¹ÍÐ•áÁ•Ñ•‘=™™±¥¹•A…•ÉÉ½ÉÌ€ô½™™±¥¹•A…•ÉÉ½ÉÌ¹™¥±Ñ•È¡µ•ÍÍ…”€ôøµ•ÍÍ…”€ôôô€Ù•¹Ðœñðµ•ÍÍ…”¹¥¹±Õ‘•Ì II}%9QI9Q}%M=99Qœ¤¤(€€€½¹ÍÐ•áÁ•Ñ•‘=™™±¥¹•I•ÅÕ•ÍÑÌ€ô½™™±¥¹•I•ÅÕ•ÍÑÌ¹™¥±Ñ•È¡É•ÅÕ•ÍÐ€ôøÉ•ÅÕ•ÍÐ¹¥¹±Õ‘•Ì II}%9QI9Q}%M=99Qœ¤¤(€€€½¹ÍÐ•áÁ•Ñ•‘=™™±¥¹•AÉ½‰•I•ÅÕ•ÍÑÌ€ô•áÁ•Ñ•‘=™™±¥¹•I•ÅÕ•ÍÑÌ¹™¥±Ñ•È¡É•ÅÕ•ÍÐ€ôøÉ•ÅÕ•ÍÐ¹¥¹±Õ‘•Ì œ½±½…Ñ¥½¸µµ…À½½™™±¥¹”µÁÉ½‰”´œ¤¤(€€€½¹ÍÐ•áÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÑÌ€ô•ÉÉ½ÉÌ¹™…¥±•‘I•ÅÕ•ÍÑÌ¹™¥±Ñ•È¡¥ÍáÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÐ¤(€€€½¹ÍÐÕ¹•áÁ•Ñ•‘½¹Í½±•ÉÉ½ÉÌ€ôl(€€€€€€¸¸¹•ÉÉ½ÉÌ¹½¹Í½±•ÉÉ½ÉÌ¹Í±¥” À°½™™±¥¹•MÑ…ÉÐ¹½¹Í½±•ÉÉ½ÉÌ¤°(€€€€€€¸¸¹½™™±¥¹•½¹Í½±•ÉÉ½ÉÌ¹™¥±Ñ•È¡µ•ÍÍ…”€ôø€…•áÁ•Ñ•‘=™™±¥¹•½¹Í½±•ÉÉ½ÉÌ¹¥¹±Õ‘•Ì¡µ•ÍÍ…”¤¤°(€€€€€€¸¸¹•ÉÉ½ÉÌ¹½¹Í½±•ÉÉ½ÉÌ¹Í±¥”¡½™™±¥¹•¹¹½¹Í½±•ÉÉ½ÉÌ¤°(€€€t(€€€½¹ÍÐÕ¹•áÁ•Ñ•‘A…•ÉÉ½ÉÌ€ôl(€€€€€€¸¸¹•ÉÉ½ÉÌ¹Á…•ÉÉ½ÉÌ¹Í±¥” À°½™™±¥¹•MÑ…ÉÐ¹Á…•ÉÉ½ÉÌ¤°(€€€€€€¸¸¹½™™±¥¹•A…•ÉÉ½ÉÌ¹™¥±Ñ•È¡µ•ÍÍ…”€ôø€…•áÁ•Ñ•‘=™™±¥¹•A…•ÉÉ½ÉÌ¹¥¹±Õ‘•Ì¡µ•ÍÍ…”¤¤°(€€€€€€¸¸¹•ÉÉ½ÉÌ¹Á…•ÉÉ½ÉÌ¹Í±¥”¡½™™±¥¹•¹¹Á…•ÉÉ½ÉÌ¤°(€€€t(€€€½¹ÍÐÕ¹•áÁ•Ñ•‘…¥±•‘I•ÅÕ•ÍÑÌ€ô•ÉÉ½ÉÌ¹™…¥±•‘I•ÅÕ•ÍÑÌ¹™¥±Ñ•È¡É•ÅÕ•ÍÐ€ôø€ (€€€€€€…•áÁ•Ñ•‘=™™±¥¹•I•ÅÕ•ÍÑÌ¹¥¹±Õ‘•Ì¡É•ÅÕ•ÍÐ¤(€€€€€€˜˜€…•áÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÑÌ¹¥¹±Õ‘•Ì¡É•ÅÕ•ÍÐ¤(€€€€¤¤(€€€½¹ÍÐ•áÁ•Ñ•‘=™™±¥¹•M¥¹…±Ì€ô•áÁ•Ñ•‘=™™±¥¹•½¹Í½±•ÉÉ½ÉÌ¹±•¹Ñ €¬•áÁ•Ñ•‘=™™±¥¹•A…•ÉÉ½ÉÌ¹±•¹Ñ €¬•áÁ•Ñ•‘=™™±¥¹•I•ÅÕ•ÍÑÌ¹±•¹Ñ (€€€•áÁ•Ð¡•áÁ•Ñ•‘=™™±¥¹•M¥¹…±Ì¤¹Ñ½	•É•…Ñ•ÉQ¡…¸ À¤(€€€•áÁ•Ð¡•áÁ•Ñ•‘=™™±¥¹•AÉ½‰•I•ÅÕ•ÍÑÌ¹±•¹Ñ ¤¹Ñ½	•É•…Ñ•ÉQ¡…¸ À¤(€€€•áÁ•Ð¡Õ¹•áÁ•Ñ•‘½¹Í½±•ÉÉ½ÉÌ¤¹Ñ½ÅÕ…°¡mt¤(€€€•áÁ•Ð¡Õ¹•áÁ•Ñ•‘A…•ÉÉ½ÉÌ¤¹Ñ½ÅÕ…°¡mt¤(€€€•áÁ•Ð¡Õ¹•áÁ•Ñ•‘…¥±•‘I•ÅÕ•ÍÑÌ¤¹Ñ½ÅÕ…°¡mt¤(€€€…Ý…¥Ð…ÑÑ…¡)Í½¸¡Ñ•ÍÑ%¹™¼°€‘•Í­Ñ½Àµ½¹Í½±”µ¹•ÑÝ½É¬µÉ••¥ÁÐ¹©Í½¸œ°ì(€€€€€€¸¸¹•ÉÉ½ÉÌ°(€€€€€½™™±¥¹•MÑ…ÉÐ°(€€€€€½™™±¥¹•¹°(€€€€€•áÁ•Ñ•‘=™™±¥¹•½¹Í½±•ÉÉ½ÉÌ°(€€€€€•áÁ•Ñ•‘=™™±¥¹•A…•ÉÉ½ÉÌ°(€€€€€•áÁ•Ñ•‘=™™±¥¹•I•ÅÕ•ÍÑÌ°(€€€€€•áÁ•Ñ•‘=™™±¥¹•AÉ½‰•I•ÅÕ•ÍÑÌ°(€€€€€•áÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÑÌ°(€€€€€Õ¹•áÁ•Ñ•‘½¹Í½±•ÉÉ½ÉÌ°(€€€€€Õ¹•áÁ•Ñ•‘A…•ÉÉ½ÉÌ°(€€€€€Õ¹•áÁ•Ñ•‘…¥±•‘I•ÅÕ•ÍÑÌ°(€€€ô¤(€€€…Ý…¥Ð…ÑÑ…¡)Í½¸¡Ñ•ÍÑ%¹™¼°€‘•Í­Ñ½Àµ¥¹Ñ•É…Ñ¥½¸µÉ••¥ÁÐ¹©Í½¸œ°ì(€€€€€•á…ÑM¡„èÁÉ½•ÍÌ¹•¹Ø¹UI%}aQ}!ñðÁÉ½•ÍÌ¹•¹Ø¹%Q!U	}M!ñð€±½…°œ°(€€€€€‰•™½É•A…¸°(€€€€€‰•™½É•A…¹QÉ…¹Í™½É´°(€€€€€…™Ñ•ÉA…¸°(€€€€€…™Ñ•ÉA…¹QÉ…¹Í™½É´°(€€€€€…™Ñ•É]¡••°°(€€€€€Í•±•Ñ•‘UÉ°°(€€€€€µ½Ñ¥½¹MÑå±•Ì°(€€€€€Ù¥•ÝÁ½ÉÑÌèlœÄÐÐÁàäÀÀœ°€œÄäÈÁàÄÀàÀt°(€€€ô¤(€ô¤((€Ñ•ÍÐ µ½‰¥±”¹…Ñ¥Ù”Ñ½Õ ‘É…œÁ¥¹ ½¹Ñ¥¹Õ…Ñ¥½¸Í•±•Ñ¥½¸…¹‘•Í•±•Ñ¥½¸Á…­•Ðœ°…Íå¹Œ€¡ìÁ…”°‰É½ÝÍ•É9…µ”ô°Ñ•ÍÑ%¹™¼¤€ôøì(€€€Ñ•ÍÐ¹Í­¥À¡‰É½ÝÍ•É9…µ”€„ôô€¡É½µ¥Õ´œ°€@¹…Ñ¥Ù”Ñ½Õ ¥¹ÁÕÐÉ•ÅÕ¥É•Ì¡É½µ¥Õ´œ¤(€€€½¹ÍÐ•ÉÉ½ÉÌ€ôµ½¹¥Ñ½È¡Á…”¤(€€€…Ý…¥ÐÁ…”¹Í•ÑY¥•ÝÁ½ÉÑM¥é”¡ìÝ¥‘Ñ è€ÌäÀ°¡•¥¡Ðè€àÐÐô¤(€€€…Ý…¥ÐÁ…”¹…‘‘%¹¥ÑMÉ¥ÁÐ  ¤€ôø±½…±MÑ½É…”¹Í•Ñ%Ñ•´ ÕÉ…¤é±½…Ñ¥½¹5…Á•µ½5½‘”œ°€ÑÉÕ”œ¤¤(€€€…Ý…¥ÐÁ…”¹½Ñ¼¡É½ÕÑ”°ìÝ…¥ÑU¹Ñ¥°è€¹•ÑÝ½É­¥‘±”œô¤(€€€…Ý…¥Ð•áÁ•Ð¡Á…”¹±½…Ñ½È m‘…Ñ„µ±½…Ñ¥½¸µµ…ÀµÍ½ÕÉ”ô‰‘¥Í±½Í•µ‘•µ¼‰tœ¤¤¹Ñ½	•Y¥Í¥‰±” ¤(€€€…Ý…¥ÐÁ…”¹ÍÉ••¹Í¡½Ð¡ìÁ…Ñ èÑ•ÍÑ%¹™¼¹½ÕÑÁÕÑA…Ñ  ‘•µ¼µµ½‰¥±”µ½Ù•ÉÙ¥•Ü¹Á¹œœ¤°™Õ±±A…”èÑÉÕ”ô¤((€€€½¹ÍÐ‰•™½É•Q½Õ €ô…Ý…¥Ð…µ•É„¡Á…”¤(€€€½¹ÍÐ‰•™½É•Q½Õ¡QÉ…¹Í™½É´€ô…Ý…¥Ð…µ•É…QÉ…¹Í™½É´¡Á…”¤(€€€…Ý…¥Ð‘¥ÍÁ…Ñ¡A½¥¹Ñ•ÉÉ…œ¡Á…”°€Ñ½Õ œ°€ÜÈ°€ÔÐ¤(€€€…Ý…¥Ð•áÁ•Ð¹Á½±°¡…Íå¹Œ€ ¤€ôø…µ•É„¡Á…”¤¤¹¹½Ð¹Ñ½ÅÕ…°¡‰•™½É•Q½Õ ¤(€€€…Ý…¥Ð•áÁ•Ð¹Á½±°¡…Íå¹Œ€ ¤€ôø…µ•É…QÉ…¹Í™½É´¡Á…”¤¤¹¹½Ð¹Ñ½	”¡‰•™½É•Q½Õ¡QÉ…¹Í™½É´¤(€€€½¹ÍÐ…™Ñ•ÉQ½Õ €ô…Ý…¥Ð…µ•É„¡Á…”¤(€€€½¹ÍÐ…™Ñ•ÉQ½Õ¡QÉ…¹Í™½É´€ô…Ý…¥Ð…µ•É…QÉ…¹Í™½É´¡Á…”¤((€€€…Ý…¥Ð¹…Ñ¥Ù•A¥¹ ¡Á…”¤(€€€…Ý…¥Ð•áÁ•Ð¹Á½±°¡…Íå¹Œ€ ¤€ôø€¡…Ý…¥Ð…µ•É„¡Á…”¤¤¹é½½´¤¹Ñ½	•É•…Ñ•ÉQ¡…¸¡…™Ñ•ÉQ½Õ ¹é½½´¤(€€€½¹ÍÐ…™Ñ•ÉA¥¹ €ô…Ý…¥Ð…µ•É„¡Á…”¤(€€€…Ý…¥Ð‘¥ÍÁ…Ñ¡A½¥¹Ñ•ÉÉ…œ¡Á…”°€Ñ½Õ œ°€ØÐ°€ÐØ¤(€€€…Ý…¥Ð•áÁ•Ð¹Á½±°¡…Íå¹Œ€ ¤€ôøì(€€€€€½¹ÍÐÙ…±Õ”€ô…Ý…¥Ð…µ•É„¡Á…”¤(€€€€€É•ÑÕÉ¸€‘íÙ…±Õ”¹áôè‘íÙ…±Õ”¹åõ€(€€€ô¤¹¹½Ð¹Ñ½	”¡€‘í…™Ñ•ÉA¥¹ ¹áôè‘í…™Ñ•ÉA¥¹ ¹åõ€¤(€€€½¹ÍÐ…™Ñ•ÉA¥¹¡Q½A…¸€ô…Ý…¥Ð…µ•É„¡Á…”¤(€€€½¹ÍÐ…™Ñ•ÉA¥¹¡Q½A…¹QÉ…¹Í™½É´€ô…Ý…¥Ð…µ•É…QÉ…¹Í™½É´¡Á…”¤((€€€…Ý…¥ÐÁ…”¹­•å‰½…É¹ÁÉ•ÍÌ !½µ”œ¤(€€€…Ý…¥Ð•áÁ•Ð¡Á…”¹•Ñ	åQ•áÐ Ñ±…Ì½Ù•ÉÙ¥•Üœ°ì•á…ÐèÑÉÕ”ô¤¤¹Ñ½	•Y¥Í¥‰±” ¤(€€€½¹ÍÐÙ¥•ÝÁ½ÉÑ	•…½¹%¹‘•à€ô…Ý…¥ÐÁ…”¹±½…Ñ½È œ¹±½…Ñ¥½¹Ñ±…Í	•…½¸œ¤¹•Ù…±Õ…Ñ•±° ¡¹½‘•Ì¤€ôøì(€€€€€½¹ÍÐ¥¹‘•à€ô¹½‘•Ì¹™¥¹‘%¹‘•à ¡¹½‘”¤€ôøì(€€€€€€€½¹ÍÐÉ•Ð€ô¹½‘”¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤(€€€€€€€½¹ÍÐà€ôÉ•Ð¹±•™Ð€¬É•Ð¹Ý¥‘Ñ €¨€¸Ô(€€€€€€€½¹ÍÐä€ôÉ•Ð¹Ñ½À€¬É•Ð¹¡•¥¡Ð€¨€¸Ô(€€€€€€€É•ÑÕÉ¸à€øô€À€˜˜ä€øô€À€˜˜à€ðÝ¥¹‘½Ü¹¥¹¹•É]¥‘Ñ €˜˜ä€ðÝ¥¹‘½Ü¹¥¹¹•É!•¥¡Ð(€€€€€ô¤(€€€€€É•ÑÕÉ¸¥¹‘•à(€€€ô¤(€€€•áÁ•Ð¡Ù¥•ÝÁ½ÉÑ	•…½¹%¹‘•à¤¹Ñ½	•É•…Ñ•ÉQ¡…¹=ÉÅÕ…° À¤(€€€…Ý…¥Ð¹…Ñ¥Ù•Q½Õ¡Q…À¡Á…”°Á…”¹±½…Ñ½È œ¹±½…Ñ¥½¹Ñ±…Í	•…½¸œ¤¹¹Ñ ¡Ù¥•ÝÁ½ÉÑ	•…½¹%¹‘•à¤¤(€€€…Ý…¥Ð•áÁ•Ð¡Á…”¹±½…Ñ½È œ¹±½…Ñ¥½¹Ñ±…ÍM•±•Ñ¥½¸œ¤¤¹Ñ½	•Y¥Í¥‰±” ¤(€€€…Ý…¥Ð•áÁ•Ð¡Á…”¤¹Ñ½!…Ù•UI0 ½Á±…•%ô¼°ìÑ¥µ•½ÕÐè€ÄÕ|ÀÀÀô¤(€€€…Ý…¥ÐÁ…”¹ÍÉ••¹Í¡½Ð¡ìÁ…Ñ èÑ•ÍÑ%¹™¼¹½ÕÑÁÕÑA…Ñ  ‘•µ¼µµ½‰¥±”µÍ•±•Ñ•¹Á¹œœ¤°™Õ±±A…”èÑÉÕ”ô¤((€€€½¹ÍÐÍ•±•Ñ¥½¸€ôÁ…”¹±½…Ñ½È œ¹±½…Ñ¥½¹Ñ±…ÍM•±•Ñ¥½¸œ¤(€€€…Ý…¥Ð¹…Ñ¥Ù•Q½Õ¡Q…À¡Á…”°Í•±•Ñ¥½¸¹•Ñ	åI½±” ‰ÕÑÑ½¸œ°ì¹…µ”è€I•ÑÕÉ¸Ñ¼…Ñ±…Ì½Ù•ÉÙ¥•Üœô¤¤(€€€…Ý…¥Ð•áÁ•Ð¡Í•±•Ñ¥½¸¤¹Ñ½	•!¥‘‘•¸ ¤(€€€…Ý…¥Ð•áÁ•Ð¡Á…”¤¹¹½Ð¹Ñ½!…Ù•UI0 ½Á±…•%ô¼°ìÑ¥µ•½ÕÐè€ÄÕ|ÀÀÀô¤(€€€…Ý…¥ÐÁ…”¹ÍÉ••¹Í¡½Ð¡ìÁ…Ñ èÑ•ÍÑ%¹™¼¹½ÕÑÁÕÑA…Ñ  ‘•µ¼µµ½‰¥±”µ‘•Í•±•Ñ•¹Á¹œœ¤°™Õ±±A…”èÑÉÕ”ô¤((€€€½¹ÍÐ•áÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÑÌ€ô•ÉÉ½ÉÌ¹™…¥±•‘I•ÅÕ•ÍÑÌ¹™¥±Ñ•È¡¥ÍáÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÐ¤(€€€½¹ÍÐÕ¹•áÁ•Ñ•‘…¥±•‘I•ÅÕ•ÍÑÌ€ô•ÉÉ½ÉÌ¹™…¥±•‘I•ÅÕ•ÍÑÌ¹™¥±Ñ•È¡É•ÅÕ•ÍÐ€ôø€…¥ÍáÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÐ¡É•ÅÕ•ÍÐ¤¤(€€€•áÁ•Ð¡•ÉÉ½ÉÌ¹½¹Í½±•ÉÉ½ÉÌ¤¹Ñ½ÅÕ…°¡mt¤(€€€•áÁ•Ð¡•ÉÉ½ÉÌ¹Á…•ÉÉ½ÉÌ¤¹Ñ½ÅÕ…°¡mt¤(€€€•áÁ•Ð¡Õ¹•áÁ•Ñ•‘…¥±•‘I•ÅÕ•ÍÑÌ¤¹Ñ½ÅÕ…°¡mt¤(€€€…Ý…¥Ð…ÑÑ…¡)Í½¸¡Ñ•ÍÑ%¹™¼°€µ½‰¥±”µ½¹Í½±”µ¹•ÑÝ½É¬µÉ••¥ÁÐ¹©Í½¸œ°ì€¸¸¹•ÉÉ½ÉÌ°•áÁ•Ñ•‘9…Ù¥…Ñ¥½¹‰½ÉÑÌ°Õ¹•áÁ•Ñ•‘…¥±•‘I•ÅÕ•ÍÑÌô¤(€€€…Ý…¥Ð…ÑÑ…¡)Í½¸¡Ñ•ÍÑ%¹™¼°€µ½‰¥±”µ¥¹Ñ•É…Ñ¥½¸µÉ••¥ÁÐ¹©Í½¸œ°ì(€€€€€•á…ÑM¡„èÁÉ½•ÍÌ¹•¹Ø¹UI%}aQ}!ñðÁÉ½•ÍÌ¹•¹Ø¹%Q!U	}M!ñð€±½…°œ°(€€€€€‰•™½É•Q½Õ °(€€€€€‰•™½É•Q½Õ¡QÉ…¹Í™½É´°(€€€€€…™Ñ•ÉQ½Õ °(€€€€€…™Ñ•ÉQ½Õ¡QÉ…¹Í™½É´°(€€€€€…™Ñ•ÉA¥¹ °(€€€€€…™Ñ•ÉA¥¹¡Q½A…¸°(€€€€€…™Ñ•ÉA¥¹¡Q½A…¹QÉ…¹Í™½É´°(€€€€€Ù¥•ÝÁ½ÉÐè€œÌäÁààÐÐœ°(€€€€€¹…Ñ¥Ù•%¹ÁÕÐèlÑ½Õ µ‘É…œœ°€ÑÝ¼µ™¥¹•ÈµÁ¥¹ œ°€Á½ÍÐµÁ¥¹ µ½¹”µ™¥¹•ÈµÁ…¸œ°€Ñ½Õ µÍ•±•Ðœ°€Ñ½Õ µ‘•Í•±•Ðt°(€€€ô¤(€ô¤)ô¤(