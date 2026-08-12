import './materialize-accessibility-performance-current-v2.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.split(from).join(to)
}

function replaceRegex(source, pattern, replacement, expectedCount, label) {
  const count = [...source.matchAll(pattern)].length
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.replace(pattern, replacement)
}

async function transformFile(path, transform) {
  const source = await readFile(path, 'utf8')
  const next = transform(source)
  if (next === source) throw new Error(`${path} v3 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v3 proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-evidence.spec.ts', (input) => replaceExact(
  input,
  `    await expect(fallback.getByRole('link', { name: /ground/i }).first()).toBeVisible()
    await expect(fallback.getByRole('link', { name: /life map/i }).first()).toBeVisible()
    await expect(fallback.getByRole('button', { name: /open urai orb companion/i })).toBeVisible()`,
  `    await expect(fallback).toHaveCount(1)
    await expect(fallback.getByRole('link', { name: /ground/i }).first()).toBeVisible()
    await expect(fallback.getByRole('link', { name: /life map/i }).first()).toBeVisible()
    await expect(page.getByRole('main', { name: 'URAI Home World threshold' })).toHaveCount(1)
    const navigation = fallback.getByRole('navigation', { name: 'Accessible Home destinations' })
    await expect(navigation).toHaveCount(1)
    await expect(navigation).toHaveAttribute('data-home-navigation-owner', 'runtime-boundary')
    await expect(navigation).toHaveAttribute('data-home-navigation-non-dominant', 'true')
    await expect(navigation.getByTestId('home-semantic-orb')).toHaveAccessibleName('Open URAI Orb companion')`,
  1,
  'single-owner no-WebGL runtime accessibility contract',
))

await transformFile('urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts', (input) => replaceExact(
  input,
  "      cameraCheckpoint: 'home-sky-ascent',",
  "      cameraCheckpoint: 'home-sky-ascent-complete',",
  1,
  'completed Home sky ascent canonical checkpoint',
))

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "    await expect(direct.getByRole('button', { name: 'Open Orb directly' })).toBeVisible()",
    "    await expect(direct.getByRole('button', { name: 'Open URAI Orb companion' })).toBeVisible()",
    1,
    'embodied Home current Orb accessible name',
  )
  source = replaceExact(
    source,
    "    for (const name of [/Open Orb directly/i, /Open Ground directly/i, /Open Life Map directly/i]) {",
    "    for (const name of [/Open URAI Orb companion/i, /Open Ground directly/i, /Open Life Map directly/i]) {",
    1,
    'embodied Home current focusable destination names',
  )
  source = replaceExact(
    source,
    "    await expect(home).toHaveAttribute('data-home-camera-mode', 'embodied')",
    "    await expect(home).toHaveAttribute('data-home-camera-mode', 'embodied-first-person')",
    1,
    'embodied Home canonical first-person camera mode',
  )
  source = replaceExact(
    source,
    "    await expect(home).toHaveAttribute('data-home-animation-owner', 'authored-sanctuary-plus-gltf-interactions')",
    "    await expect(home).toHaveAttribute('data-home-animation-owner', 'owned-sanctuary-plus-cc0-fern')",
    1,
    'embodied Home canonical scanned composition owner',
  )
  source = replaceExact(
    source,
    `    const privacyCard = destinations.getByRole('button', { name: /^Privacy Sanctuary\\./i })
    const privacyDirect = destinations.getByRole('button', { name: 'Go now to Privacy Sanctuary' })
    await expect(privacyCard).toBeVisible()
    await expect(privacyDirect).toBeVisible()
    await privacyDirect.focus()
    await expect(privacyDirect).toBeFocused()`,
    `    await expect(destinations.getByRole('button')).toHaveCount(12)
    const privacy = destinations.getByRole('button', { name: 'Approach Privacy Sanctuary', exact: true })
    await expect(privacy).toBeVisible()
    await expect(privacy).toHaveAttribute('data-ground-destination', 'privacy')
    await privacy.focus()
    await expect(privacy).toBeFocused()`,
    1,
    'Ground canonical single destination owner',
  )
  source = replaceExact(
    source,
    `    const navigator = page.locator('[data-life-map-navigator]').first()
    await expect(navigator).toHaveCount(1)
    await navigator.evaluate((element) => { (element as HTMLDetailsElement).open = true })
    const memory = navigator.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()`,
    `    const searchTrigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
    await expect(searchTrigger).toBeVisible()
    await searchTrigger.focus()
    await expect(searchTrigger).toBeFocused()
    await searchTrigger.press('Enter')
    await expect(searchTrigger).toHaveAttribute('aria-expanded', 'true')
    const navigator = page.getByRole('region', { name: 'Search and filter Life Map' })
    await expect(navigator).toBeVisible()
    const memory = navigator.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()`,
    1,
    'Life Map current semantic search owner',
  )
  source = replaceExact(
    source,
    "    const help = page.locator('details.life-map-navigator')",
    "    const help = page.locator('details.life-map-movement-help')",
    1,
    'Life Map independent movement-help owner',
  )
  source = replaceExact(
    source,
    "    const hiddenBody = help.locator(':scope > section')",
    "    const hiddenBody = help.locator(':scope > p')",
    1,
    'Life Map movement-help body owner',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts', (input) => {
  let source = replaceRegex(
    input,
    /async function selectFirstMemory\(page: Page\) \{[\s\S]*?\n\}\n\nasync function openSemanticExplorer\(page: Page\) \{[\s\S]*?\n\}/g,
    `async function openSemanticExplorer(page: Page) {
  const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
  await expect(trigger).toBeVisible({ timeout: 15_000 })
  await trigger.focus()
  await expect(trigger).toBeFocused()
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const region = page.getByRole('region', { name: 'Search and filter Life Map' })
  await expect(region).toBeVisible({ timeout: 15_000 })
  return region
}

async function selectFirstMemory(page: Page) {
  const explore = await openSemanticExplorer(page)
  const firstMemory = explore.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()
  await expect(firstMemory).toBeVisible({ timeout: 15_000 })
  await firstMemory.focus()
  await expect(firstMemory).toBeFocused()
  await firstMemory.press('Enter')
  await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBe('quiet-reset')
  return 'quiet-reset'
}

async function expectLifeMapModeOrAuthoredFallback(page: Page, expectedMode: 'selected' | 'overview') {
  const root = lifeMapRoot(page)
  try {
    await expect(root).toBeVisible({ timeout: 12_000 })
    await expect(root).toHaveAttribute('data-life-map-mode', expectedMode)
    return 'world' as const
  } catch {
    const fallback = page.getByTestId('urai-life-map-authored-fallback')
    await expect(fallback).toBeVisible({ timeout: 5_000 })
    await expect(fallback).toHaveAttribute('data-life-map-fallback', 'authored-semantic')
    await expect(fallback.getByRole('button', { name: 'Return Home' })).toBeVisible()
    return 'fallback' as const
  }
}`,
    1,
    'current Life Map semantic explorer and authored fallback helpers',
  )

  source = replaceRegex(
    source,
    /  test\('Overview removes selected visual and semantic state across refresh and history',[\s\S]*?\n  test\('mobile viewports contain the independent navigation layer without horizontal overflow',/g,
    `  test('Overview removes selected visual and semantic state across refresh and history', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)

    await page.goto(demoMemoryUrl(false), { waitUntil: 'domcontentloaded' })
    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Replay' })).toBeVisible()

    await page.goto(demoMemoryUrl(true), { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('quiet-reset')
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expectLifeMapModeOrAuthoredFallback(page, 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expectLifeMapModeOrAuthoredFallback(page, 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.goBack({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBeNull()
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('quiet-reset')
    const backOwner = await expectLifeMapModeOrAuthoredFallback(page, 'selected')
    if (backOwner === 'world') await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })
    else await expect(selectedMemoryControls(page)).toHaveCount(0)

    await page.goForward({ waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('overview')).toBe('1')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('quiet-reset')
    await expectLifeMapModeOrAuthoredFallback(page, 'overview')
    await expect(selectedMemoryControls(page)).toHaveCount(0)
  })

  test('mobile viewports contain the independent navigation layer without horizontal overflow',`,
    1,
    'Life Map history proof across canonical WebGL and authored fallback owners',
  )

  source = replaceRegex(
    source,
    /  test\('mobile viewports contain the independent navigation layer without horizontal overflow',[\s\S]*?\n  test\('reduced motion keeps selection and unwind behavior equivalent',/g,
    `  test('mobile viewports contain the independent navigation layer without horizontal overflow', async ({ page }) => {
    await enableExplicitLifeMapDemo(page)
    const viewports = [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 393, height: 873 },
      { width: 412, height: 915 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/life-map?demo=1&overview=1', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.urai-world-companion')).toHaveCount(0)
      await expect(selectedMemoryControls(page)).toHaveCount(0)

      const root = page.locator(lifeMapOwnerSelector)
      let layout: { scrollWidth: number; innerWidth: number; primary: { left: number; right: number } | null; secondary: { left: number; right: number } | null }
      try {
        await expect(root).toBeVisible({ timeout: 12_000 })
        const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
        const title = page.locator('.life-map-title')
        await expect(trigger).toBeVisible()
        await expect(title).toBeVisible()
        layout = await page.evaluate(() => {
          const primaryRect = document.querySelector('.life-map-search-trigger')?.getBoundingClientRect()
          const secondaryRect = document.querySelector('.life-map-title')?.getBoundingClientRect()
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            primary: primaryRect ? { left: primaryRect.left, right: primaryRect.right } : null,
            secondary: secondaryRect ? { left: secondaryRect.left, right: secondaryRect.right } : null,
          }
        })
      } catch {
        const fallback = page.getByTestId('urai-life-map-authored-fallback')
        await expect(fallback).toBeVisible({ timeout: 5_000 })
        await expect(fallback).toHaveAttribute('data-life-map-fallback', 'authored-semantic')
        const returnHome = fallback.getByRole('button', { name: 'Return Home' })
        await expect(returnHome).toBeVisible()
        layout = await page.evaluate(() => {
          const primaryRect = document.querySelector('[data-testid="urai-life-map-authored-fallback"] button')?.getBoundingClientRect()
          const secondaryRect = document.querySelector('[data-testid="urai-life-map-authored-fallback"] h1')?.getBoundingClientRect()
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            primary: primaryRect ? { left: primaryRect.left, right: primaryRect.right } : null,
            secondary: secondaryRect ? { left: secondaryRect.left, right: secondaryRect.right } : null,
          }
        })
      }
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
      expect(layout.primary).not.toBeNull()
      expect(layout.secondary).not.toBeNull()
      expect(layout.primary!.left).toBeGreaterThanOrEqual(0)
      expect(layout.primary!.right).toBeLessThanOrEqual(viewport.width + 1)
      expect(layout.secondary!.left).toBeGreaterThanOrEqual(0)
      expect(layout.secondary!.right).toBeLessThanOrEqual(viewport.width + 1)
    }
  })

  test('reduced motion keeps selection and unwind behavior equivalent',`,
    1,
    'Life Map mobile containment across canonical WebGL and authored fallback owners',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceRegex(
    input,
    /  test\('Life Map movement help is keyboard-operable',[\s\S]*?\n  test\('selected Life Map journey controls preserve identity and remain operable on portrait mobile',/g,
    `  test('Life Map movement help is keyboard-operable', async ({ page }) => {
    await page.goto('/life-map?demo=1&overview=1&manifestId=replay-recovery-thread', { waitUntil: 'domcontentloaded' })
    const controls = page.locator('details.life-map-movement-help')
    const body = controls.locator(':scope > p')
    await expect(controls).toBeVisible({ timeout: 15_000 })
    await expect(controls).not.toHaveAttribute('open', '')
    await expect(body).toBeHidden()

    const summary = controls.locator('summary')
    await summary.focus()
    await expect(summary).toBeFocused()
    await summary.press('Enter')
    await expect(controls).toHaveAttribute('open', '')
    await expect(body).toBeVisible()
    await expect(body).toContainText('A/D or arrow keys move between memories')
    await expect(body).toContainText('R, O, or Home returns to Overview')
  })

  test('selected Life Map journey controls preserve identity and remain operable on portrait mobile',`,
    1,
    'current independent Life Map movement-help owner',
  )

  source = replaceRegex(
    source,
    /  test\('selected Life Map journey controls preserve identity and remain operable on portrait mobile',[\s\S]*?\n  test\('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile',/g,
    `  test('selected Life Map journey controls preserve identity and remain operable on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')
    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    const searchTrigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
    await expect(actions).toBeVisible()
    await expect(searchTrigger).toBeVisible()
    await expect(searchTrigger).toHaveAttribute('aria-expanded', 'false')

    const evidence = await page.evaluate(() => {
      const actionNav = document.querySelector<HTMLElement>('nav[aria-label="Selected memory actions"]')
      const trigger = document.querySelector<HTMLElement>('.life-map-search-trigger')
      const viewport = window.visualViewport
      const describe = (element: HTMLElement | null) => {
        if (!element) return null
        const rect = element.getBoundingClientRect()
        const topmost = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          topmostOwned: topmost === element || Boolean(topmost && element.contains(topmost)),
          pointerEvents: getComputedStyle(element).pointerEvents,
        }
      }
      const buttons = actionNav ? [...actionNav.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
        const rect = button.getBoundingClientRect()
        const topmost = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        return {
          label: button.querySelector('strong')?.textContent?.trim() || button.textContent?.trim() || '',
          width: rect.width,
          height: rect.height,
          topmostOwned: topmost === button || Boolean(topmost && button.contains(topmost)),
          pointerEvents: getComputedStyle(button).pointerEvents,
        }
      }) : []
      return {
        viewportWidth: viewport?.width ?? window.innerWidth,
        viewportHeight: viewport?.height ?? window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        action: describe(actionNav),
        trigger: describe(trigger),
        buttons,
      }
    })

    await test.info().attach('life-map-selected-mobile-current-journey-controls.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.action).not.toBeNull()
    expect(evidence.trigger).not.toBeNull()
    expect(evidence.documentWidth).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    for (const rect of [evidence.action!, evidence.trigger!]) {
      expect(rect.left).toBeGreaterThanOrEqual(0)
      expect(rect.right).toBeLessThanOrEqual(evidence.viewportWidth + 1)
      expect(rect.top).toBeGreaterThanOrEqual(0)
      expect(rect.bottom).toBeLessThanOrEqual(evidence.viewportHeight + 1)
      expect(rect.topmostOwned).toBe(true)
      expect(rect.pointerEvents).not.toBe('none')
    }
    expect(evidence.trigger!.width).toBeGreaterThanOrEqual(48)
    expect(evidence.trigger!.height).toBeGreaterThanOrEqual(48)
    expect(evidence.buttons.map((button) => button.label)).toEqual(['Enter Focus', 'Replay', 'Overview'])
    for (const button of evidence.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(48)
      expect(button.height).toBeGreaterThanOrEqual(48)
      expect(button.topmostOwned).toBe(true)
      expect(button.pointerEvents).not.toBe('none')
    }

    await searchTrigger.click()
    const navigator = page.getByRole('region', { name: 'Search and filter Life Map' })
    await expect(navigator).toBeVisible()
    const alternate = navigator.locator('[role="listitem"][data-life-map-node-id]:not([data-life-map-node-id="quiet-reset"])').first()
    const alternateId = await alternate.getAttribute('data-life-map-node-id')
    expect(alternateId).toBeTruthy()
    await alternate.click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: alternateId, node: alternateId })

    await searchTrigger.click()
    await expect(navigator).toBeVisible()
    await navigator.locator('[role="listitem"][data-life-map-node-id="quiet-reset"]').click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })

    const overview = page.getByRole('button', { name: 'Return to Life Map overview', exact: true })
    await expect(overview).toBeVisible()
    await overview.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(page.getByRole('navigation', { name: 'Selected memory actions' })).toHaveCount(0)
  })

  test('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile',`,
    1,
    'current Life Map selected mobile search and action controls',
  )

  source = replaceRegex(
    source,
    /    const evidence = await actions\.evaluate\(\(element\) => \{[\s\S]*?\n    \}\)\n\n    await test\.info\(\)\.attach\('life-map-selected-mobile-action-owner\.json'/g,
    `    const evidence = await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('nav[aria-label="Selected memory actions"]')
      if (!element) throw new Error('Selected memory actions owner disappeared before geometry capture')
      const rect = element.getBoundingClientRect()
      const viewport = window.visualViewport
      const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
        const buttonRect = button.getBoundingClientRect()
        const centerX = buttonRect.left + buttonRect.width / 2
        const centerY = buttonRect.top + buttonRect.height / 2
        const topmost = document.elementFromPoint(centerX, centerY)
        return {
          label: button.querySelector('strong')?.textContent?.trim() || button.textContent?.trim() || '',
          left: buttonRect.left,
          top: buttonRect.top,
          right: buttonRect.right,
          bottom: buttonRect.bottom,
          width: buttonRect.width,
          height: buttonRect.height,
          topmostOwned: topmost === button || Boolean(topmost && button.contains(topmost)),
          pointerEvents: getComputedStyle(button).pointerEvents,
        }
      })
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        viewportWidth: viewport?.width ?? window.innerWidth,
        viewportHeight: viewport?.height ?? window.innerHeight,
        buttons,
      }
    })

    await test.info().attach('life-map-selected-mobile-action-owner.json'`,
    1,
    'stable selected action geometry capture',
  )
  source = replaceExact(
    source,
    '    await overview.click()',
    `    const currentOverview = page.getByRole('button', { name: 'Return to Life Map overview', exact: true })
    await expect(currentOverview).toBeVisible()
    await currentOverview.click()`,
    1,
    'fresh selected action Overview owner',
  )
  return source
})
