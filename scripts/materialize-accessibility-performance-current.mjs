import { preserveAuditedLifeMapProof } from './materialize-accessibility-performance-lifemap-authority.mjs'
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

// This proof now lives in its audited current form; historical rewrites must
// never replace its stronger privacy, identity, title, and mobile assertions.
await preserveAuditedLifeMapProof()

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "page.locator('details.life-map-help')",
    "page.locator('details.life-map-navigator')",
    1,
    'visual Life Map semantic navigator',
  )
  source = replaceExact(
    source,
    "controls.locator('.life-map-help__body')",
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
  return source
})
