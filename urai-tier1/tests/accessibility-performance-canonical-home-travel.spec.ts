import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3000'
const fallbackSettleMs = 2_800
const postTransitionStabilityMs = 900
const disclosedSampleManifest = 'replay-recovery-thread'

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

function settledIdentity(page: Page, destination: Destination) {
  const url = new URL(page.url())
  const demo = url.searchParams.get('demo')
  const manifestId = url.searchParams.get('manifestId')
  const overview = url.searchParams.get('overview')

  return {
    pathname: normalizedPathname(url.toString()),
    demo,
    manifestId,
    overview,
    authorized: destination.id !== 'life-map'
      ? demo !== '1'
      : demo === '1'
        ? manifestId === disclosedSampleManifest && overview === '1'
        : true,
  }
}

async function waitForAuthorizedSettledIdentity(page: Page, destination: Destination) {
  await expect.poll(
    () => settledIdentity(page, destination).authorized,
    { timeout: 15_000, message: `${destination.id} must finish only authorized destination-owned enrichment` },
  ).toBe(true)

  if (destination.id === 'life-map') {
    await expect.poll(
      () => {
        const current = settledIdentity(page, destination)
        return current.demo === '1'
          ? current.manifestId === disclosedSampleManifest && current.overview === '1'
          : current.pathname === destination.pathname
      },
      { timeout: 15_000, message: 'Life Map must settle into canonical private or disclosed-sample identity' },
    ).toBe(true)
  }

  return settledIdentity(page, destination)
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

  const identity = await waitForAuthorizedSettledIdentity(page, destination)
  const settledUrl = page.url()

  await page.waitForTimeout(fallbackSettleMs + postTransitionStabilityMs)
  expect(canonicalSignature(page, destination)).toBe(expected)
  expect(settledIdentity(page, destination)).toEqual(identity)
  expect(page.url()).toBe(settledUrl)

  await page.goBack({ waitUntil: 'domcontentloaded' })
  await expect.poll(() => normalizedPathname(page.url()), { timeout: 15_000 }).toBe('/home')
  await page.waitForTimeout(fallbackSettleMs)
  expect(normalizedPathname(page.url())).toBe('/home')

  return {
    destination: destination.id,
    activation: activation.id,
    canonicalUrl: settledUrl,
    settledIdentity: identity,
    backUrl: page.url(),
    fallbackSettleMs,
    postTransitionStabilityMs,
  }
}

for (const destination of destinations) {
  for (const activation of activations) {
    test(`${activation.id} to ${destination.id} converges on canonical context and Back remains stable`, async ({ browser }, testInfo) => {
      test.setTimeout(90_000)
      const context = await browser.newContext({ baseURL, ...activation.context })
      try {
        const report = await proveCanonicalTravel(context, destination, activation)
        await testInfo.attach(`canonical-home-travel-${destination.id}-${activation.id}.json`, {
          body: JSON.stringify(report, null, 2),
          contentType: 'application/json',
        })
        expect(report.destination).toBe(destination.id)
        expect(report.activation).toBe(activation.id)
      } finally {
        await context.close()
      }
    })
  }
}
