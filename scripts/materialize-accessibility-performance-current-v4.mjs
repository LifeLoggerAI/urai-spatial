import { preserveAuditedLifeMapProof } from './materialize-accessibility-performance-lifemap-authority.mjs'
import './materialize-accessibility-performance-current-v3.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceExact(source, from, to, expectedCount, label) {
  const staleCount = source.split(from).length - 1
  if (staleCount === expectedCount) return source.split(from).join(to)
  const currentCount = source.split(to).length - 1
  if (staleCount === 0 && currentCount === expectedCount) return source
  throw new Error(`${label} expected ${expectedCount} stale or current audited occurrence(s); found stale=${staleCount} current=${currentCount}`)
}

function replaceRegex(source, pattern, replacement, expectedCount, label) {
  const staleCount = [...source.matchAll(pattern)].length
  if (staleCount === expectedCount) return source.replace(pattern, replacement)
  const currentCount = source.split(replacement).length - 1
  if (staleCount === 0 && currentCount === expectedCount) return source
  throw new Error(`${label} expected ${expectedCount} stale or current audited occurrence(s); found stale=${staleCount} current=${currentCount}`)
}

async function transformFile(path, transform) {
  const source = await readFile(path, 'utf8')
  const next = transform(source)
  if (next === source) {
    console.log(`Accessibility-performance v4 proof already current at ${path}`)
    return
  }
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
  let source = input
  source = replaceExact(
    source,
    "    const privacyCard = destinations.getByRole('button', { name: /^Privacy Sanctuary\\./i })",
    "    const privacyCard = destinations.getByRole('button', { name: 'Approach Privacy Sanctuary' })",
    1,
    'current Ground Privacy Sanctuary approach label',
  )
  source = replaceExact(
    source,
    `    const privacyDirect = destinations.getByRole('button', { name: 'Go now to Privacy Sanctuary' })
    await expect(privacyCard).toBeVisible()
    await expect(privacyDirect).toBeVisible()
    await privacyDirect.focus()
    await expect(privacyDirect).toBeFocused()`,
    `    await expect(privacyCard).toBeVisible()
    await privacyCard.focus()
    await expect(privacyCard).toBeFocused()
    await privacyCard.press('Enter')
    await expect(privacyCard).toHaveAttribute('aria-current', 'location')`,
    1,
    'current Ground semantic destination activation',
  )

  const staleMemorySelection = /    const navigator = page\.locator\('\[data-life-map-navigator\]'\)\.first\(\)\n    await expect\(navigator\)\.toHaveCount\(1\)\n    await navigator\.evaluate\(\(element\) => \{ \(element as HTMLDetailsElement\)\.open = true \}\)\n    const memory = navigator\.getByRole\('listitem'\)\.filter\(\{ hasText: 'The Quiet Reset' \}\)\.first\(\)/g
  const currentMemorySelection = `    const searchTrigger = page.locator('.life-map-search-trigger').first()
    await expect(searchTrigger).toBeVisible()
    await expect(searchTrigger).toHaveAccessibleName('Search and navigate Life Map')
    await searchTrigger.click()
    const navigator = page.locator('section.life-map-navigator[aria-label="Search and filter Life Map"]').first()
    await expect(navigator).toBeVisible()
    const memory = navigator.locator('button[data-life-map-semantic-result][data-life-map-node-id="quiet-reset"]').first()
    await expect(memory).toHaveAccessibleName(/The Quiet Reset/i)`
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
  source = replaceExact(
    source,
    "  test('closed mobile Life Map movement help stays compact and cannot obstruct the world', async ({ page }) => {",
    "  test('closed mobile Life Map search trigger stays compact and cannot obstruct the world', async ({ page }) => {",
    1,
    'current mobile Life Map accessibility owner title',
  )
  source = replaceExact(
    source,
    `    const help = page.locator('details.life-map-movement-help')
    await expect(help).toBeVisible()
    await expect(help).not.toHaveAttribute('open', '')
    const rect = await help.boundingBox()
    expect(rect).not.toBeNull()
    expect(rect!.width).toBeLessThanOrEqual(250)
    expect(rect!.height).toBeGreaterThanOrEqual(48)
    expect(rect!.height).toBeLessThanOrEqual(52)
    expect(rect!.x).toBeGreaterThanOrEqual(0)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)
    expect(rect!.y).toBeGreaterThanOrEqual(0)
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)
    expect(rect!.height / 873).toBeLessThan(0.08)

    const hiddenBody = help.locator(':scope > p')
    await expect(hiddenBody).toBeHidden()
    await help.locator('summary').press('Enter')
    await expect(help).toHaveAttribute('open', '')
    await expect(hiddenBody).toBeVisible()`,
    `    const trigger = page.locator('.life-map-search-trigger').first()
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAccessibleName('Search and navigate Life Map')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const rect = await trigger.boundingBox()
    expect(rect).not.toBeNull()
    expect(rect!.width).toBeGreaterThanOrEqual(48)
    expect(rect!.width).toBeLessThanOrEqual(52)
    expect(rect!.height).toBeGreaterThanOrEqual(48)
    expect(rect!.height).toBeLessThanOrEqual(52)
    expect(rect!.x).toBeGreaterThanOrEqual(0)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)
    expect(rect!.y).toBeGreaterThanOrEqual(0)
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)
    expect(rect!.height / 873).toBeLessThan(0.08)

    await trigger.focus()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('section.life-map-navigator[aria-label="Search and filter Life Map"]').first()).toBeVisible()`,
    1,
    'current mobile Life Map compact keyboard-operable search trigger',
  )
  return source
})

// This proof now lives in its audited current form; historical rewrites must
// never replace its stronger privacy, identity, title, and mobile assertions.
await preserveAuditedLifeMapProof()

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = input
  source = replaceExact(
    source,
    "test.describe('URAI visual ownership and containment evidence', () => {",
    "test.describe('URAI visual ownership and containment evidence', () => {\n  test.describe.configure({ timeout: 90_000 })",
    1,
    'spatial visual software-renderer timeout envelope',
  )

  const staleMovementHelp = /  test\('Life Map movement help is keyboard-operable', async \(\{ page \}\) => \{[\s\S]*?\n  \}\)\n\n  test\('selected Life Map journey controls preserve identity and remain operable on portrait mobile'/g
  const currentSemanticSearch = `  test('Life Map semantic search is keyboard-operable', async ({ page }) => {
    await page.goto('/life-map?demo=1&overview=1&manifestId=replay-recovery-thread', { waitUntil: 'domcontentloaded' })
    const trigger = page.locator('.life-map-search-trigger').first()
    await expect(trigger).toBeVisible({ timeout: 15_000 })
    await expect(trigger).toHaveAccessibleName('Search and navigate Life Map')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const region = page.locator('section.life-map-navigator[aria-label="Search and filter Life Map"]').first()
    await expect(region).toBeVisible({ timeout: 15_000 })
    await expect(region.locator('button[data-life-map-semantic-result]').first()).toBeVisible()
  })

  test('selected Life Map journey controls preserve identity and remain operable on portrait mobile'`
  source = replaceRegex(source, staleMovementHelp, currentSemanticSearch, 1, 'current Life Map semantic search keyboard proof')

  source = replaceExact(
    source,
    "    const navigator = page.locator('details.life-map-navigator')\n    const summary = navigator.locator('summary')",
    "    const summary = page.locator('.life-map-search-trigger').first()",
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