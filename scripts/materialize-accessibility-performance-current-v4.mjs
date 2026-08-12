import './materialize-accessibility-performance-current-v3.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  return source.split(from).join(to)
}

function replaceRegex(source, pattern, replacement, expectedCount, label) {
  const count = [...source.matchAll(pattern)].length
  if (count !== expectedCount) throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  return source.replace(pattern, replacement)
}

async function transformFile(path, transform) {
  const source = await readFile(path, 'utf8')
  const next = transform(source)
  if (next === source) throw new Error(`${path} v4 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v4 proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "    await expect(home).toHaveAttribute('data-home-animation-owner', 'owned-sanctuary-plus-cc0-fern')",
    "    await expect(home).toHaveAttribute('data-home-animation-owner', 'canonical-sanctuary-plus-cc0-fern-plus-living-orb')",
    1,
    'canonical Home animation owner',
  )
  source = replaceExact(
    source,
    `    await memory.focus()\n    await expect(memory).toBeFocused()\n    await memory.press('Enter')`,
    `    await memory.evaluate((element: HTMLElement) => element.focus())\n    await expect(memory).toBeFocused()\n    await page.keyboard.press('Enter')`,
    1,
    'stable keyboard activation of current Life Map semantic result',
  )
  source = replaceRegex(
    source,
    /  test\('closed mobile Life Map movement help stays compact and cannot obstruct the world',[\s\S]*?\n  test\('mobile movement controls remain contained, touch-sized, and move through Home',/g,
    `  test('closed mobile Life Map semantic opener stays compact and keyboard-operable', async ({ page }) => {\n    await enableLifeMapDemo(page)\n    await page.setViewportSize({ width: 393, height: 873 })\n    await page.goto('/life-map/?demo=1', { waitUntil: 'domcontentloaded' })\n    await expect(page.getByTestId('urai-true-3d-life-map')).toBeVisible({ timeout: 15_000 })\n\n    const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })\n    await expect(trigger).toBeVisible()\n    await expect(trigger).toHaveAttribute('aria-expanded', 'false')\n    const rect = await trigger.boundingBox()\n    expect(rect).not.toBeNull()\n    expect(rect!.width).toBeGreaterThanOrEqual(48)\n    expect(rect!.height).toBeGreaterThanOrEqual(48)\n    expect(rect!.x).toBeGreaterThanOrEqual(0)\n    expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)\n    expect(rect!.y).toBeGreaterThanOrEqual(0)\n    expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)\n\n    await trigger.evaluate((element: HTMLElement) => element.focus())\n    await expect(trigger).toBeFocused()\n    await page.keyboard.press('Enter')\n    await expect(trigger).toHaveAttribute('aria-expanded', 'true')\n    await expect(page.getByRole('region', { name: 'Search and filter Life Map' })).toBeVisible()\n  })\n\n  test('mobile movement controls remain contained, touch-sized, and move through Home',`,
    1,
    'current compact Life Map semantic opener evidence',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts', (input) => {
  let source = replaceExact(
    input,
    `  await firstMemory.focus()\n  await expect(firstMemory).toBeFocused()\n  await firstMemory.press('Enter')`,
    `  await firstMemory.evaluate((element: HTMLElement) => element.focus())\n  await expect(firstMemory).toBeFocused()\n  await page.keyboard.press('Enter')`,
    1,
    'stable helper keyboard activation of current semantic result',
  )
  source = replaceExact(
    source,
    `    await firstMemory.focus()\n    await expect(firstMemory).toBeFocused()\n    await firstMemory.press('Enter')`,
    `    await firstMemory.evaluate((element: HTMLElement) => element.focus())\n    await expect(firstMemory).toBeFocused()\n    await page.keyboard.press('Enter')`,
    1,
    'stable direct keyboard activation of current semantic result',
  )
  source = replaceExact(
    source,
    `    await page.goto(demoMemoryUrl(false), { waitUntil: 'domcontentloaded' })\n    await expect(lifeMapRoot(page)).toHaveAttribute('data-life-map-mode', 'selected')\n    await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })\n    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })).toBeVisible()\n    await expect(selectedMemoryControls(page).getByRole('button', { name: 'Replay' })).toBeVisible()`,
    `    await page.goto(demoMemoryUrl(false), { waitUntil: 'domcontentloaded' })\n    const initialOwner = await expectLifeMapModeOrAuthoredFallback(page, 'selected')\n    if (initialOwner === 'world') {\n      await expect(selectedMemoryControls(page)).toBeVisible({ timeout: 15_000 })\n      await expect(selectedMemoryControls(page).getByRole('button', { name: 'Enter Focus' })).toBeVisible()\n      await expect(selectedMemoryControls(page).getByRole('button', { name: 'Replay' })).toBeVisible()\n    } else {\n      await expect(selectedMemoryControls(page)).toHaveCount(0)\n    }`,
    1,
    'initial selected state across canonical WebGL and authored fallback owners',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "test.describe('URAI visual ownership and containment evidence', () => {",
    "test.describe('URAI visual ownership and containment evidence', () => {\n  test.describe.configure({ timeout: 90_000 })",
    1,
    'software-renderer visual evidence timeout envelope',
  )
  source = replaceRegex(
    source,
    /  test\('Life Map movement help is keyboard-operable',[\s\S]*?\n  test\('selected Life Map journey controls preserve identity and remain operable on portrait mobile',/g,
    `  test('Life Map semantic opener is keyboard-operable', async ({ page }) => {\n    await page.goto('/life-map?demo=1&overview=1&manifestId=replay-recovery-thread', { waitUntil: 'domcontentloaded' })\n    const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' })\n    await expect(trigger).toBeVisible({ timeout: 15_000 })\n    await expect(trigger).toHaveAttribute('aria-expanded', 'false')\n    await trigger.evaluate((element: HTMLElement) => element.focus())\n    await expect(trigger).toBeFocused()\n    await page.keyboard.press('Enter')\n    await expect(trigger).toHaveAttribute('aria-expanded', 'true')\n    const region = page.getByRole('region', { name: 'Search and filter Life Map' })\n    await expect(region).toBeVisible()\n    await expect(region.getByRole('list', { name: 'Visible Life Map objects' })).toBeVisible()\n  })\n\n  test('selected Life Map journey controls preserve identity and remain operable on portrait mobile',`,
    1,
    'current keyboard-operable semantic opener',
  )
  source = replaceExact(
    source,
    `    await searchTrigger.click()\n    const navigator = page.getByRole('region', { name: 'Search and filter Life Map' })`,
    `    await searchTrigger.evaluate((element: HTMLElement) => element.focus())\n    await expect(searchTrigger).toBeFocused()\n    await page.keyboard.press('Enter')\n    const navigator = page.getByRole('region', { name: 'Search and filter Life Map' })`,
    1,
    'journey search opener keyboard activation',
  )
  source = replaceExact(
    source,
    `    await alternate.click()`,
    `    await alternate.evaluate((element: HTMLElement) => element.focus())\n    await expect(alternate).toBeFocused()\n    await page.keyboard.press('Enter')`,
    1,
    'journey alternate semantic result keyboard activation',
  )
  source = replaceExact(
    source,
    `    await searchTrigger.click()\n    await expect(navigator).toBeVisible()\n    await navigator.locator('[role="listitem"][data-life-map-node-id="quiet-reset"]').click()`,
    `    await searchTrigger.evaluate((element: HTMLElement) => element.focus())\n    await expect(searchTrigger).toBeFocused()\n    await page.keyboard.press('Enter')\n    await expect(navigator).toBeVisible()\n    const quietReset = navigator.locator('[role="listitem"][data-life-map-node-id="quiet-reset"]')\n    await quietReset.evaluate((element: HTMLElement) => element.focus())\n    await expect(quietReset).toBeFocused()\n    await page.keyboard.press('Enter')`,
    1,
    'journey return semantic result keyboard activation',
  )
  return source
})
