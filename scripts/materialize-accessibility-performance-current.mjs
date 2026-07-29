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
  if (next === source) throw new Error(`${path} materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts', (input) => {
  const stale = `  const navigation = page.getByRole('navigation', { name: 'Direct Home destinations' })
  await expect(navigation).toBeVisible({ timeout: 30_000 })
  const target = navigation.getByRole('button', { name: destination.label, exact: true })
  await expect(target).toBeVisible()`
  const current = `  const navigation = page.locator('.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]').first()
  await expect(navigation).toHaveCount(1)
  await expect(navigation).toHaveAttribute('data-home-navigation-non-dominant', 'true')
  const target = navigation.getByTestId(\`home-semantic-\${destination.id}\`)
  await expect(target).toHaveCount(1)
  await expect(target).toHaveAccessibleName(destination.label)`
  return replaceExact(input, stale, current, 1, 'canonical Home semantic navigation contract')
})

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "page.locator('.urai-final-home-world')",
    'page.locator(homeOwnerSelector)',
    3,
    'embodied Home primary owner selector',
  )
  source = replaceExact(
    source,
    "page.getByRole('navigation', { name: 'Direct Home destinations' })",
    "page.getByRole('navigation', { name: 'Accessible Home destinations' })",
    1,
    'embodied Home semantic navigation name',
  )
  source = replaceExact(
    source,
    "    const memory = page.getByRole('button', { name: /The Quiet Reset Recovery/i }).first()",
    `    const navigator = page.locator('[data-life-map-navigator]').first()
    await expect(navigator).toHaveCount(1)
    await navigator.evaluate((element) => { (element as HTMLDetailsElement).open = true })
    const memory = navigator.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()`,
    1,
    'embodied current Life Map memory selector',
  )
  source = replaceExact(
    source,
    "page.locator('details.life-map-movement-help')",
    "page.locator('details.life-map-navigator')",
    1,
    'embodied current Life Map navigator',
  )
  source = replaceExact(
    source,
    "const hiddenBody = help.locator(':scope > p')",
    "const hiddenBody = help.locator(':scope > section')",
    1,
    'embodied current Life Map navigator body',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts', (input) => {
  let source = replaceExact(
    input,
    `function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\\/+$/, '') || '/'
}`,
    `function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\\/+$/, '') || '/'
}

function demoMemoryUrl(overview: boolean) {
  const params = new URLSearchParams({
    demo: '1',
    memoryId: 'quiet-reset',
    manifestId: 'replay-recovery-thread',
    node: 'quiet-reset',
  })
  if (overview) params.set('overview', '1')
  return \`/life-map?\${params.toString()}\`
}`,
    1,
    'Life Map exact demo identity helper',
  )
  source = replaceExact(
    source,
    'details.life-map-help',
    'details.life-map-navigator',
    3,
    'Life Map current semantic navigator selector',
  )
  source = replaceExact(
    source,
    "const firstMemory = explore.locator('button').first()",
    "const firstMemory = explore.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()",
    1,
    'Life Map reduced-motion memory result selector',
  )
  source = replaceExact(
    source,
    "const firstMemory = explorer.getByRole('button').first()",
    "const firstMemory = explorer.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()",
    1,
    'Life Map keyboard memory result selector',
  )
  source = replaceExact(
    source,
    "page.getByText('Explore', { exact: true })",
    "page.getByText('Search life', { exact: true })",
    1,
    'Life Map current semantic summary copy',
  )
  source = replaceExact(
    source,
    "page.getByText('Sample constellation · not your memories', { exact: true })",
    "page.getByText('Disclosed sample universe · not your memories', { exact: true })",
    1,
    'Life Map current disclosed-demo boundary copy',
  )
  source = replaceExact(
    source,
    "await expect(page.locator('.life-map-title')).toContainText((firstLabel || '').split(':')[0].trim())",
    "await expect(page.locator('aside[aria-label=\"Selected life object details\"] h2')).toContainText((firstLabel || '').split('·')[0].trim())",
    1,
    'Life Map current selected identity owner',
  )
  source = replaceExact(source, "'memory-thread'", "'quiet-reset'", 2, 'Life Map exact selected demo identity')
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "page.locator('.urai-final-home-world')",
    "page.locator('.urai-asset-home-world[data-home-primary-owner=\"asset-driven\"]')",
    1,
    'visual Home primary owner',
  )
  source = replaceExact(
    source,
    "page.locator('details.life-map-help')",
    "page.locator('details.life-map-navigator')",
    1,
    'visual Life Map semantic navigator',
  )
  source = replaceExact(
    source,
    "controls.locator(':scope > div')",
    "controls.locator(':scope > section')",
    1,
    'visual Life Map semantic navigator body',
  )

  const journeyPattern = /  test\('selected Life Map journey rail is painted, topmost, contained, and directly operable on portrait mobile',[\s\S]*?\n  test\('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile',/g
  const journeyReplacement = `  test('selected Life Map journey controls preserve identity and remain operable on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')

    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    const navigator = page.locator('details.life-map-navigator')
    const summary = navigator.locator('summary')
    await expect(actions).toBeVisible()
    await expect(summary).toBeVisible()

    const evidence = await page.evaluate(() => {
      const actionNav = document.querySelector<HTMLElement>('nav[aria-label="Selected memory actions"]')
      const searchSummary = document.querySelector<HTMLElement>('details.life-map-navigator summary')
      const viewport = window.visualViewport
      const describe = (element: HTMLElement | null) => {
        if (!element) return null
        const rect = element.getBoundingClientRect()
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
      }
      const buttons = actionNav ? [...actionNav.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
        const rect = button.getBoundingClientRect()
        const topmost = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        return {
          label: button.textContent?.trim() || '',
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
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
        summary: describe(searchSummary),
        buttons,
      }
    })

    await test.info().attach('life-map-selected-mobile-current-journey-controls.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.action).not.toBeNull()
    expect(evidence.summary).not.toBeNull()
    expect(evidence.documentWidth).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    for (const rect of [evidence.action!, evidence.summary!]) {
      expect(rect.left).toBeGreaterThanOrEqual(0)
      expect(rect.right).toBeLessThanOrEqual(evidence.viewportWidth + 1)
      expect(rect.top).toBeGreaterThanOrEqual(0)
      expect(rect.bottom).toBeLessThanOrEqual(evidence.viewportHeight + 1)
    }
    expect(evidence.summary!.height).toBeGreaterThanOrEqual(44)
    expect(evidence.buttons.map((button) => button.label)).toEqual(['Enter Focus', 'Replay', 'Overview'])
    for (const button of evidence.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(48)
      expect(button.height).toBeGreaterThanOrEqual(48)
      expect(button.topmostOwned).toBe(true)
      expect(button.pointerEvents).not.toBe('none')
    }

    await page.keyboard.press('ArrowRight')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advanced = new URL(page.url())
    expect(advanced.searchParams.get('memoryId')).toBe(advanced.searchParams.get('node'))

    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })

    await actions.getByRole('button', { name: 'Overview', exact: true }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(actions).toHaveCount(0)
  })

  test('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile',`
  source = replaceRegex(source, journeyPattern, journeyReplacement, 1, 'current Life Map mobile journey proof')
  source = replaceExact(
    source,
    "page.locator('.life-map-actions')",
    "page.getByRole('navigation', { name: 'Selected memory actions' })",
    1,
    'current selected Life Map action owner',
  )
  return source
})
