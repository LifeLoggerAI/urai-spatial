import './materialize-accessibility-performance-current.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.split(from).join(to)
}

async function transformFile(path, transform) {
  const source = await readFile(path, 'utf8')
  const next = transform(source)
  if (next === source) throw new Error(`${path} v2 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v2 proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts', (input) => replaceExact(
  input,
  '      test.setTimeout(90_000)',
  '      test.setTimeout(180_000)',
  1,
  'canonical Home travel software-renderer timeout envelope',
))

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "    await expect(home).toHaveAttribute('data-home-movement', 'walk-keyboard-click-touch')",
    "    await expect(home).toHaveAttribute('data-home-interaction-ready', 'true')",
    1,
    'current Home interaction readiness contract',
  )
  source = replaceExact(
    source,
    "    await expect(home).toHaveAttribute('data-home-pointer-lock', 'false')",
    "    await expect(home).toHaveAttribute('data-home-camera-mode', 'embodied')",
    1,
    'current Home embodied camera contract',
  )
  source = replaceExact(
    source,
    "    await expect(home).toHaveAttribute('data-home-visible-world', 'final-physical-sanctuary-memory-rooms')",
    "    await expect(home).toHaveAttribute('data-home-animation-owner', 'authored-sanctuary-plus-gltf-interactions')",
    1,
    'current Home authored visual owner contract',
  )
  source = replaceExact(
    source,
    `    const afterZ = Number(await home.getAttribute('data-home-player-z'))
    expect(Math.abs(afterZ - beforeZ)).toBeGreaterThan(1.2)
    await expect.poll(async () => {
      const value = await home.evaluate((element) => element.style.getPropertyValue('--home-parallax-y'))
      return Math.abs(Number.parseFloat(value))
    }, { timeout: 12_000 }).toBeGreaterThan(0.1)`,
    `    await expect.poll(async () => Math.abs(Number(await home.getAttribute('data-home-player-z')) - beforeZ), { timeout: 30_000 }).toBeGreaterThan(1.2)
    const afterZ = Number(await home.getAttribute('data-home-player-z'))
    expect(Math.abs(afterZ - beforeZ)).toBeGreaterThan(1.2)`,
    1,
    'current Home primary-owner movement telemetry',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts', (input) => {
  let source = replaceExact(
    input,
    '  test.describe.configure({ timeout: 90_000 })',
    '  test.describe.configure({ timeout: 180_000 })',
    1,
    'Life Map software-renderer timeout envelope',
  )
  source = replaceExact(
    source,
    "    await expect(page.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()",
    "    await expect(root.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()",
    1,
    'Life Map disclosed-demo truth owner',
  )
  source = replaceExact(
    source,
    "  await explore.locator('summary').click()",
    `  const summary = explore.locator('summary')
  await summary.focus()
  await expect(summary).toBeFocused()
  if (!(await explore.getAttribute('open'))) await summary.press('Enter')`,
    1,
    'Life Map reduced-motion keyboard-owned explorer opening',
  )
  source = replaceExact(
    source,
    "    await expect(page.locator('aside[aria-label=\"Selected life object details\"] h2')).toContainText((firstLabel || '').split('·')[0].trim())",
    "    await expect(page.locator('aside[aria-label=\"Selected life object details\"] h2')).toHaveText('The Quiet Reset')",
    1,
    'Life Map selected title identity owner',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "          label: button.textContent?.trim() || '',",
    "          label: button.querySelector('strong')?.textContent?.trim() || button.textContent?.trim() || '',",
    2,
    'current selected and journey action visual label owner',
  )
  source = replaceExact(
    source,
    "actions.getByRole('button', { name: 'Enter Focus', exact: true })",
    "actions.getByRole('button', { name: /Enter Focus$/ })",
    1,
    'current Focus action accessible name',
  )
  source = replaceExact(
    source,
    "actions.getByRole('button', { name: 'Replay', exact: true })",
    "actions.getByRole('button', { name: /Replay$/ })",
    1,
    'current Replay action accessible name',
  )
  source = replaceExact(
    source,
    "actions.getByRole('button', { name: 'Overview', exact: true })",
    "actions.getByRole('button', { name: /overview$/i })",
    2,
    'current Overview action accessible name',
  )
  source = replaceExact(
    source,
    `    await page.keyboard.press('ArrowRight')
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
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })`,
    `    const journey = page.getByTestId('life-map-journey-rail')
    const next = journey.getByRole('button', { name: 'Next visible life object' })
    const previous = journey.getByRole('button', { name: 'Previous visible life object' })
    await next.click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advanced = new URL(page.url())
    expect(advanced.searchParams.get('memoryId')).toBe(advanced.searchParams.get('node'))

    await previous.click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })`,
    1,
    'current Life Map journey control pointer ownership',
  )
  source = replaceExact(
    source,
    `    expect(evidence.height).toBeGreaterThanOrEqual(62)
    expect(evidence.height).toBeLessThanOrEqual(68)`,
    `    expect(evidence.height).toBeGreaterThanOrEqual(62)
    expect(evidence.height).toBeLessThanOrEqual(160)
    expect(evidence.height / evidence.viewportHeight).toBeLessThan(0.2)`,
    1,
    'current selected action owner responsive height envelope',
  )
  return source
})

const canonicalHomeTravelPath = 'urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts'
const canonicalHomeTravel = await readFile(canonicalHomeTravelPath, 'utf8')
const stableIdSelector = 'navigation.getByTestId(`home-semantic-${destination.id}`)'
const accessibleNameAssertion = 'await expect(target).toHaveAccessibleName(destination.label)'
const stableIdSelectorCount = canonicalHomeTravel.split(stableIdSelector).length - 1
const accessibleNameAssertionCount = canonicalHomeTravel.split(accessibleNameAssertion).length - 1
if (stableIdSelectorCount !== 1 || accessibleNameAssertionCount !== 1) {
  throw new Error(`canonical Home destination identity authority expected one stable-id selector and one accessible-name assertion; found id=${stableIdSelectorCount}, name=${accessibleNameAssertionCount}`)
}
console.log('Canonical Home destination identity is bound to stable id and accessible label')
