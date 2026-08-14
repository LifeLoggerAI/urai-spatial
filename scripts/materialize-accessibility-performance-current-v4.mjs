import './materialize-accessibility-performance-current-v3.mjs'
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
  if (next === source) throw new Error(`${path} v4 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v4 proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts', (input) => replaceExact(
  input,
  "      cameraCheckpoint: 'home-sky-ascent',",
  "      cameraCheckpoint: 'home-sky-ascent-complete',",
  1,
  'canonical completed Home sky ascent checkpoint',
))

await transformFile('urai-tier1/tests/accessibility-performance-home-sensory-boundary.spec.ts', (input) => replaceExact(
  input,
  '[data-urai-spatial-audio-runtime="production-opus-v1"]',
  '[data-urai-spatial-audio-runtime="production-opus-v2"]',
  1,
  'current production spatial-audio runtime version',
))

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "    await expect(home).toHaveAttribute('data-home-camera-mode', 'embodied')",
    "    await expect(home).toHaveAttribute('data-home-camera-mode', 'embodied-first-person')",
    1,
    'current Home camera mode',
  )
  source = replaceExact(
    source,
    "    const privacyCard = destinations.getByRole('button', { name: /^Privacy Sanctuary\\./i })",
    "    const privacyCard = destinations.getByRole('button', { name: 'Approach Privacy Sanctuary' })",
    1,
    'current Ground Privacy Sanctuary approach label',
  )

  const staleMemorySelection = /    const navigator = page\.locator\('\[data-life-map-navigator\]'\)\.first\(\)\n    await expect\(navigator\)\.toHaveCount\(1\)\n    await navigator\.evaluate\(\(element\) => \{ \(element as HTMLDetailsElement\)\.open = true \}\)\n    const memory = navigator\.getByRole\('listitem'\)\.filter\(\{ hasText: 'The Quiet Reset' \}\)\.first\(\)/g
  const currentMemorySelection = `    const searchTrigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
    await expect(searchTrigger).toBeVisible()
    await searchTrigger.click()
    const navigator = page.getByRole('region', { name: 'Search and filter Life Map' })
    await expect(navigator).toBeVisible()
    const memory = navigator.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()`
  source = replaceRegex(source, staleMemorySelection, currentMemorySelection, 1, 'current Life Map semantic search memory selection')

  source = replaceExact(
    source,
    "page.locator('details.life-map-navigator')",
    "page.locator('details.life-map-movement-help')",
    1,
    'current Life Map mobile movement help owner',
  )
  source = replaceExact(
    source,
    "const hiddenBody = help.locator(':scope > section')",
    "const hiddenBody = help.locator(':scope > p')",
    1,
    'current Life Map mobile movement help body',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts', (input) => {
  let source = input

  const selectFirstMemoryPattern = /async function selectFirstMemory\(page: Page\) \{[\s\S]*?\n\}/g
  const selectFirstMemoryCurrent = `async function selectFirstMemory(page: Page) {
  const searchTrigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
  await expect(searchTrigger).toBeVisible({ timeout: 15_000 })
  await searchTrigger.focus()
  await expect(searchTrigger).toBeFocused()
  await searchTrigger.press('Enter')
  const explorer = page.getByRole('region', { name: 'Search and filter Life Map' })
  await expect(explorer).toBeVisible()
  const firstMemory = explorer.getByRole('listitem').filter({ hasText: 'The Quiet Reset' }).first()
  await expect(firstMemory).toBeVisible()
  const label = await firstMemory.innerText()
  await firstMemory.getByRole('button').focus()
  await expect(firstMemory.getByRole('button')).toBeFocused()
  await firstMemory.getByRole('button').press('Enter')
  await expect.poll(() => new URL(page.url()).searchParams.get('memoryId'), { timeout: 15_000 }).toBeTruthy()
  return label
}`
  source = replaceRegex(source, selectFirstMemoryPattern, selectFirstMemoryCurrent, 1, 'current Life Map reduced-motion semantic selection helper')

  const openExplorerPattern = /async function openSemanticExplorer\(page: Page\) \{[\s\S]*?\n\}/g
  const openExplorerCurrent = `async function openSemanticExplorer(page: Page) {
  const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })
  await expect(trigger).toBeVisible({ timeout: 15_000 })
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await trigger.press('Enter')
  const region = page.getByRole('region', { name: 'Search and filter Life Map' })
  await expect(region).toBeVisible({ timeout: 15_000 })
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  return region
}`
  source = replaceRegex(source, openExplorerPattern, openExplorerCurrent, 1, 'current Life Map semantic explorer helper')

  source = replaceExact(
    source,
    "    await expect(page.getByText('Search life', { exact: true })).toBeVisible()",
    "    await expect(page.getByRole('button', { name: 'Search and navigate Life Map' })).toBeVisible()",
    1,
    'current Life Map search trigger visibility',
  )

  source = replaceExact(
    source,
    "    await expect(page.locator('aside[aria-label=\"Selected life object details\"] h2')).toHaveText('The Quiet Reset')",
    `    const selectedUrl = new URL(page.url())
    expect(selectedUrl.searchParams.get('memoryId')).toBe(selectedUrl.searchParams.get('node'))
    await expect(page.getByRole('navigation', { name: 'Selected memory actions' })).toBeVisible()`,
    1,
    'current selected Life Map identity and action owner',
  )

  source = replaceExact(
    source,
    "await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview')",
    "await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'overview', { timeout: 15_000 })",
    3,
    'Life Map overview settlement timeout envelope',
  )

  source = replaceExact(
    source,
    "const summary = document.querySelector('details.life-map-navigator summary')?.getBoundingClientRect()",
    "const summary = document.querySelector('.life-map-search-trigger')?.getBoundingClientRect()",
    1,
    'current mobile Life Map search trigger geometry',
  )
  source = replaceExact(
    source,
    "const title = document.querySelector('.life-map-title')?.getBoundingClientRect()",
    "const title = document.querySelector('[data-testid=\"urai-true-3d-life-map\"]')?.getBoundingClientRect()",
    1,
    'current mobile Life Map owner geometry',
  )

  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = input
  source = replaceExact(
    source,
    "test.describe('URAI visual ownership and containment evidence', () => {",
    "test.describe('URAI visual ownership and containment evidence', () => {\n  test.describe.configure({ timeout: 90_000 })",
    1,
    'spatial visual software-renderer timeout envelope',
  )
  source = replaceExact(
    source,
    "const controls = page.locator('details.life-map-navigator')",
    "const controls = page.locator('details.life-map-movement-help')",
    1,
    'current visual Life Map movement help owner',
  )
  source = replaceExact(
    source,
    "controls.locator(':scope > section')",
    "controls.locator(':scope > p')",
    1,
    'current visual Life Map movement help body',
  )
  source = replaceExact(
    source,
    "    const navigator = page.locator('details.life-map-navigator')\n    const summary = navigator.locator('summary')",
    "    const summary = page.getByRole('button', { name: 'Search and navigate Life Map' })",
    1,
    'current selected Life Map semantic trigger',
  )
  source = replaceExact(
    source,
    "const searchSummary = document.querySelector<HTMLElement>('details.life-map-navigator summary')",
    "const searchSummary = document.querySelector<HTMLElement>('.life-map-search-trigger')",
    1,
    'current selected Life Map semantic trigger geometry',
  )
  return source
})
