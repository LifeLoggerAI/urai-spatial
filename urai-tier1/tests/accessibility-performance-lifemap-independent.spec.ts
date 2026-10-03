import { expect, test, type Locator, type Page } from '@playwright/test'

const lifeMapOwnerSelector = '[data-testid="urai-true-3d-life-map"]'

async function enableExplicitLifeMapDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

function demoMemoryUrl(overview: boolean) {
  return `/life-map?demo=1&memoryId=memory-thread&node=memory-thread&manifestId=replay-recovery-thread${overview ? '&overview=1' : ''}`
}

function lifeMapRoot(page: Page) {
  return page.getByTestId('urai-true-3d-life-map')
}

function selectedMemoryControls(page: Page) {
  return page.getByRole('navigation', { name: 'Selected memory actions' })
}

async function selectFirstMemory(page: Page) {
  const explorer = await openSemanticExplorer(page)
  const firstMemory = explorer.locator('[data-life-map-semantic-result]').first()
  await expect(firstMemory).toBeVisible({ timeout: 15_000 })
  await firstMemory.click()
  await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
  return new URL(page.url()).searchParams.get('memoryId')
}

async function openSemanticExplorer(page: Page) {
  const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
  await expect(trigger).toBeVisible({ timeout: 15_000 })
  await trigger.focus()
  await expect(trigger).toBeFocused()
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const explorer = page.getByRole('region', { name: 'Search and filter Life Map' })
  await expect(explorer).toBeVisible()
  return explorer
}


async function expectViewportContained(page: Page, locator: Locator) {
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: window.innerWidth, height: window.innerHeight }
  })
  expect(geometry.left).toBeGreaterThanOrEqual(-1)
  expect(geometry.top).toBeGreaterThanOrEqual(-1)
  expect(geometry.right).toBeLessThanOrEqual(geometry.width + 1)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 1)
  return geometry
}

async function measureTargets(locator: Locator) {
  return locator.evaluateAll((elements) => elements.map((element) => {
    // A native checkbox's associated label is its complete pointer target.
    const target = element.matches('input[type="checkbox"]') ? element.closest('label') || element : element
    const rect = target.getBoundingClientRect()
    const style = getComputedStyle(target)
    return { html: element.outerHTML.slice(0, 180), width: rect.width, height: rect.height, visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 }
  }).filter((target) => target.visible))
}

test.describe('Life Map independent realm runtime evidence', () => {
  test.describe.configure({ timeout: 90_000 })

  test('Life Map does not mount the Home companion visually, semantically, or in the tab sequence', async ({ page }) => {
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })
    const shell = page.locator('[data-testid="urai-persistent-world-shell"]')
    await expect(shell).toHaveAttribute('data-world-destination', 'life-map')
    await expect(shell).toHaveAttribute('data-companion-owned', 'false')
    await expect(lifeMapRoot(page)).toBeVisible({ timeout: 15_000 })
    await expect(lifeMapRoot(page)).toHaveAttribute('data-home-companion-owned', 'false')
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
    await expect(page.locator('.urai-world-companion__orb')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /orb travel controls/i })).toHaveCount(0)

    const forbiddenTabStops = await page.locator('button,a[href],summary,[tabindex]:not([tabindex="-1"])').evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      .filter((element) => element.matches('.urai-world-companion, .urai-world-companion *') || /orb travel controls/i.test(element.getAttribute('aria-label') || ''))
      .map((element) => element.outerHTML.slice(0, 240)))
    expect(forbiddenTabStops).toEqual([])
    await expect(page.getByRole('button', { name: 'Search and navigate Life Map' })).toBeVisible()
  })

  test('keyboard-accessible memory selection preserves identity into Focus', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })

    const root = lifeMapRoot(page)
    await expect(root).toBeVisible({ timeout: 15_000 })
    await expect(root).toHaveAttribute('data-life-map-source', 'explicit-demo')
    const explorer = await openSemanticExplorer(page)
    await expect(explorer.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()
    await expect(root.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()

    const firstMemory = explorer.locator('[data-life-map-semantic-result]').first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    const firstLabel = await firstMemory.locator('strong').textContent()
    await firstMemory.focus()
    await expect(firstMemory).toBeFocused()
    await firstMemory.press('Enter')

    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    const selectedUrl = new URL(page.url())
    const selectedMemoryId = selectedUrl.searchParams.get('memoryId')
    expect(selectedMemoryId).toBeTruthy()
    await expect(root).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(page.locator('.life-map-title')).toContainText((firstLabel || '').trim())

    const actions = selectedMemoryControls(page)
    await expect(actions).toBeVisible({ timeout: 15_000 })
    const focus = actions.getByRole('button', { name: 'Enter Focus' })
    await focus.focus()
    await expect(focus).toBeFocused()
    await focus.press('Enter')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/focus')
    const focusUrl = new URL(page.url())
    expect(focusUrl.searchParams.get('memoryId')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('node')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('demo')).toBe('1')
    expect(focusUrl.searchParams.get('returnNode')).toBe(selectedMemoryId)
    expect(focusUrl.searchParams.get('manifestId')).toBe('replay-recovery-thread')
    expect(focusUrl.searchParams.get('from')).toBe('life-map')
  })

  test('Overview removes selected visual and semantic state across refresh and history', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)

    await page.goto(demoMemoryUrl(false), { waitUntil: 'domcontentloaded' })
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Replay' })).toBeVisible()

    await page.goto(demoMemoryUrl(true), { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.reload({ waitUntil: 'commit', timeout: 30_000 })
    await expect(page.locator(lifeMapOwnerSelector)).toHaveCount(1, { timeout: 30_000 })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview')

    await page.goBack({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBeNull()
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })

    await page.goForward({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('memory-thread')
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)
  })

  test('mobile and desktop viewports contain searchable Life Map controls with 48px targets', async ({ page }) => {
    test.setTimeout(120_000)
    await enableExplicitLifeMapDemo(page)
    const viewports = [
      { width: 320, height: 568 },
      { width: 568, height: 320 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 393, height: 873 },
      { width: 412, height: 915 },
      { width: 1280, height: 720 },
    ]
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(viewports[0])
    await page.goto('/life-map?demo=1&overview=1', { waitUntil: 'domcontentloaded' })
    const reports = []

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await expect(page.locator(lifeMapOwnerSelector)).toBeVisible()
      await expect(page.locator('.urai-world-companion')).toHaveCount(0)
      await expect(selectedMemoryControls(page)).toHaveCount(0)

      const layout = await page.evaluate(() => {
        const summary = document.querySelector('.life-map-search-trigger')?.getBoundingClientRect()
        const title = document.querySelector('.life-map-title')?.getBoundingClientRect()
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          summary: summary ? { left: summary.left, right: summary.right } : null,
          title: title ? { left: title.left, right: title.right } : null,
        }
      })
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
      expect(layout.summary).not.toBeNull()
      expect(layout.title).not.toBeNull()
      expect(layout.summary!.left).toBeGreaterThanOrEqual(0)
      expect(layout.summary!.right).toBeLessThanOrEqual(viewport.width)
      expect(layout.title!.left).toBeGreaterThanOrEqual(0)
      expect(layout.title!.right).toBeLessThanOrEqual(viewport.width)

      const explorer = await openSemanticExplorer(page)
      const explorerBox = await explorer.boundingBox()
      expect(explorerBox).not.toBeNull()
      expect(explorerBox!.x).toBeGreaterThanOrEqual(0)
      expect(explorerBox!.x + explorerBox!.width).toBeLessThanOrEqual(viewport.width)
      const geometry = await expectViewportContained(page, explorer)
      const targets = await measureTargets(explorer.locator('button,input'))
      expect(targets.length).toBeGreaterThan(2)
      expect(targets.filter((target) => target.width < 48 || target.height < 48)).toEqual([])
      const results = explorer.getByRole('list', { name: 'Visible Life Map objects' })
      const lastResult = results.getByRole('button').last()
      await expect(lastResult).toBeVisible()
      await lastResult.focus()
      await lastResult.scrollIntoViewIfNeeded()
      await expect(lastResult).toBeFocused()
      await expectViewportContained(page, lastResult)
      reports.push({ viewport, geometry, targets, scroll: await explorer.evaluate((element) => ({ overflowY: getComputedStyle(element).overflowY, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight })) })
      await test.info().attach(`life-map-semantic-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot(), contentType: 'image/png' })
      await explorer.getByRole('button', { name: 'Close Life Map search' }).click()
      await expect(page.getByRole('button', { name: 'Search and navigate Life Map' })).toBeFocused()
    }
    await test.info().attach('life-map-semantic-reflow-and-targets.json', { body: JSON.stringify(reports, null, 2), contentType: 'application/json' })
  })

  test('search filters expose their state and retain focus without invoking world shortcuts', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/life-map?demo=1&overview=1', { waitUntil: 'domcontentloaded' })
    const explorer = await openSemanticExplorer(page)
    await expect(explorer.getByRole('textbox', { name: 'Search memories, people, dates, places, themes, and eras' })).toBeFocused()
    const types = explorer.getByRole('group', { name: 'Filter by life object type' })
    await expect(types.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const memory = types.getByRole('button', { name: 'Memory', exact: true })
    await memory.click()
    await expect(memory).toHaveAttribute('aria-pressed', 'true')
    await expect(types.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'false')
    const list = explorer.getByRole('list', { name: 'Visible Life Map objects' })
    const result = list.getByRole('button').first()
    await expect(result).toBeVisible()
    expect(await list.getByRole('listitem').count()).toBe(await list.getByRole('button').count())
    await expect(result).not.toHaveAttribute('role', 'listitem')
    const identity = page.url()
    await memory.focus()
    await memory.press('ArrowRight')
    await memory.press('Home')
    await expect(memory).toBeFocused()
    expect(page.url()).toBe(identity)
    await memory.press('Escape')
    await expect(explorer).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Search and navigate Life Map' })).toBeFocused()
    expect(page.url()).toBe(identity)
  })

  test('semantic layout tolerates RTL, long memory strings, and enlarged text', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/life-map?demo=1&overview=1', { waitUntil: 'domcontentloaded' })
    const explorer = await openSemanticExplorer(page)
    // This is a disclosed synthetic layout stress fixture, not localization or historical evidence.
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl'
      const panel = document.querySelector<HTMLElement>('#life-map-navigator')!
      panel.style.fontSize = '200%'
      const title = panel.querySelector('header strong')!
      title.textContent = 'LongTranslatedSearchNavigationHeading'.repeat(5)
      const result = panel.querySelector<HTMLButtonElement>('[data-life-map-semantic-result]')!
      result.querySelector('strong')!.textContent = 'هذه ذاكرة طويلة لاختبار التفاف النص'.repeat(8)
      result.querySelector('small')!.textContent = 'UnbrokenMemorySourceDescription'.repeat(15)
    })
    await expectViewportContained(page, explorer)
    const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
    const triggerBox = await trigger.boundingBox()
    expect(triggerBox!.x).toBeLessThanOrEqual(13)
    const panelBox = await explorer.boundingBox()
    expect(panelBox!.x).toBeLessThanOrEqual(13)
    const overflow = await explorer.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    expect(overflow.overflowY).toBe('auto')
    expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight)
    const last = explorer.getByRole('list').getByRole('button').last()
    await last.focus()
    await last.scrollIntoViewIfNeeded()
    await expectViewportContained(page, last)
    await test.info().attach('synthetic-rtl-text-layout-stress.png', { body: await page.screenshot(), contentType: 'image/png' })
    await test.info().attach('synthetic-rtl-text-layout-stress.json', { body: JSON.stringify({ fixture: 'synthetic-layout-only', overflow }, null, 2), contentType: 'application/json' })
  })

  test('reduced motion keeps selection and unwind behavior equivalent', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })
    await selectFirstMemory(page)
    await expect(page.locator(lifeMapOwnerSelector)).toHaveAttribute('data-life-map-phase', 'arrival')
    const actions = selectedMemoryControls(page)
    await actions.getByRole('button', { name: 'Return to Life Map overview' }).click()
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
    await page.reload({ waitUntil: 'commit', timeout: 30_000 })
    await expect(page.locator(lifeMapOwnerSelector)).toHaveCount(1, { timeout: 30_000 })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
  })
})

test.describe('Supporting route responsive and accessible runtime evidence', () => {
  test('auth settings and support retain reachable 48px controls and viewport scroll at 320px and landscape', async ({ page }) => {
    test.setTimeout(120_000)
    const reports = []
    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(viewport)
      for (const route of ['/login', '/settings', '/support']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        const main = page.locator('main').first()
        await expect(main).toBeVisible()
        const layout = await main.evaluate((element) => ({ overflowY: getComputedStyle(element).overflowY, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }))
        expect(layout.overflowY).toBe('auto')
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
        const targets = await measureTargets(main.locator('a[href],button:not([disabled]),input:not([disabled])'))
        expect(targets.length).toBeGreaterThan(0)
        expect(targets.filter((target) => target.width < 48 || target.height < 48)).toEqual([])
        if (route === '/settings') {
          await expect(main.getByRole('checkbox', { name: 'Low stimulation', exact: true })).toBeVisible()
          await expect(main.getByRole('checkbox', { name: 'Haptics', exact: true })).toBeVisible()
        }
        if (layout.scrollHeight > layout.clientHeight + 1) {
          await main.evaluate((element) => { element.scrollTop = element.scrollHeight })
          await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
        }
        const lastLink = main.locator('a[href]').last()
        await lastLink.focus()
        await expect(lastLink).toBeFocused()
        await expectViewportContained(page, lastLink)
        const firstLink = main.locator('a[href]').first()
        await firstLink.focus()
        await expect(firstLink).toBeFocused()
        await expectViewportContained(page, firstLink)
        reports.push({ viewport, route, layout, targets })
        if (viewport.width === 320) await test.info().attach(`supporting-${route.slice(1)}-320px.png`, { body: await page.screenshot(), contentType: 'image/png' })
      }
    }
    await page.goto('/signup', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => normalizedPathname(page.url())).toBe('/login')
    expect(new URL(page.url()).searchParams.get('intent')).toBe('signup')
    await page.goto('/settings/privacy', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => normalizedPathname(page.url())).toBe('/privacy-controls')
    expect(new URL(page.url()).searchParams.get('from')).toBe('settings-privacy')
    await test.info().attach('supporting-reflow-scroll-and-targets.json', { body: JSON.stringify(reports, null, 2), contentType: 'application/json' })
  })

  test('onboarding instructions and dismissal remain reachable in small portrait and landscape', async ({ page }) => {
    test.setTimeout(90_000)
    const reports = []
    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport)
      await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
      await expect.poll(() => normalizedPathname(page.url())).toBe('/')
      expect(new URL(page.url()).searchParams.get('onboarding')).toBe('1')
      const guide = page.locator('.uraiV2OnboardingCard[data-first-run="guided"]')
      await expect(guide).toBeVisible()
      const geometry = await expectViewportContained(page, guide)
      const targets = await measureTargets(guide.locator('a[href],button'))
      expect(targets.length).toBe(2)
      expect(targets.filter((target) => target.width < 48 || target.height < 48)).toEqual([])
      const dismiss = guide.getByRole('button', { name: 'Skip', exact: true })
      await dismiss.focus()
      await expect(dismiss).toBeFocused()
      await expectViewportContained(page, dismiss)
      reports.push({ viewport, geometry, targets })
      await test.info().attach(`onboarding-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot(), contentType: 'image/png' })
      await dismiss.press('Enter')
      await expect(guide).toHaveCount(0)
    }
    await test.info().attach('onboarding-small-viewport-report.json', { body: JSON.stringify(reports, null, 2), contentType: 'application/json' })
  })
})
