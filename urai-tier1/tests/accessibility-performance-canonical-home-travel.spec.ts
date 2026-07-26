import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3000'
const fallbackSettleMs = 2_800

const destinations = [
  {
    id: 'ground',
    label: 'Open Ground directly',
    pathname: '/ground',
    params: {
      entryPortal: 'home-ground',
      cameraCheckpoint: 'home-ground-descent',
    },
  },
  {
    id: 'life-map',
    label: 'Open Life Map directly',
    pathname: '/life-map',
    params: {
      from: 'home-sky',
      entryPortal: 'home-sky',
      cameraCheckpoint: 'home-sky-ascent',
    },
  },
] as const

const activations = [
  {
    id: 'desktop-pointer',
    method: 'pointer',
    context: { viewport: { width: 1440, height: 1100 } },
  },
  {
    id: 'desktop-keyboard',
    method: 'keyboard',
    context: { viewport: { width: 1440, height: 1100 } },
  },
  {
    id: 'mobile-touch',
    method: 'touch',
    context: {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  },
] as const

type Destination = (typeof destinations)[number]
type Activation = (typeof activations)[number]

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

function canonicalSignature(page: Page, destination: Destination) {
  const url = new URL(page.url())
  const params = Object.fromEntries(
    Object.keys(destination.params).map((key) => [key, url.searchParams.get(key)]),
  )
  return JSON.stringify({ pathname: normalizedPathname(url.toString()), params })
}

function expectedSignature(destination: Destination) {
  return JSON.stringify({ pathname: destination.pathname, params: destination.params })
}

async function activate(page: Page, destination: Destination, activation: Activation) {
  const navigation = page.getByRole('navigation', { name: 'Direct Home destinations' })
  await expect(navigation).toBeVisible({ timeout: 30_000 })
  const target = navigation.getByRole('button', { name: destination.label, exact: true })
  await expect(target).toBeVisible()
  await expect(target).toBeEnabled()
  await target.scrollIntoViewIfNeeded()

  if (activation.method === 'keyboard') {
    await target.focus()
    await expect(target).toBeFocused()
    await target.press('Enter', { noWaitAfter: true })
    return
  }

  if (activation.method === 'touch') {
    await target.tap({ noWaitAfter: true })
    return
  }

  await target.click({ noWaitAfter: true })
}

async function proveCanonicalTravel(
  context: BrowserContext,
  destination: Destination,
  activation: Activation,
) {
  const page = await context.newPage()
  await page.goto('/home/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

  await activate(page, destination, activation)

  const expected = expectedSignature(destination)
  await expect.poll(
    () => canonicalSignature(page, destination),
    { timeout: 20_000, message: `${activation.id} must settle on the canonical ${destination.id} URL` },
  ).toBe(expected)

  const canonicalUrl = page.url()
  await page.waitForTimeout(fallbackSettleMs)
  expect(canonicalSignature(page, destination)).toBe(expected)
  expect(page.url()).toBe(canonicalUrl)

  await page.goBack({ waitUntil: 'domcontentloaded' })
  await expect.poll(() => normalizedPathname(page.url()), { timeout: 15_000 }).toBe('/home')
  await page.waitForTimeout(fallbackSettleMs)
  expect(normalizedPathname(page.url())).toBe('/home')

  return {
    destination: destination.id,
    activation: activation.id,
    canonicalUrl,
    backUrl: page.url(),
    fallbackSettleMs,
  }
}

test('Home doorway inputs converge on canonical context and Back remains stable', async ({ browser }, testInfo) => {
  test.setTimeout(180_000)
  const report: Array<{
    destination: string
    activation: string
    canonicalUrl: string
    backUrl: string
    fallbackSettleMs: number
  }> = []

  for (const destination of destinations) {
    for (const activation of activations) {
      await test.step(`${activation.id} to ${destination.id}`, async () => {
        const context = await browser.newContext({ baseURL, ...activation.context })
        try {
          report.push(await proveCanonicalTravel(context, destination, activation))
        } finally {
          await context.close()
        }
      })
    }
  }

  await testInfo.attach('canonical-home-travel-report.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  })

  expect(report).toHaveLength(destinations.length * activations.length)
})
