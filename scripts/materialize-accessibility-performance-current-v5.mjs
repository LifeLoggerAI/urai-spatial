import './materialize-accessibility-performance-current-v4.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceRegex(source, pattern, replacement, expectedCount, label) {
  const count = [...source.matchAll(pattern)].length
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.replace(pattern, replacement)
}

const path = 'urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts'
const input = await readFile(path, 'utf8')

const staleJourneyRail = /  test\('selected Life Map journey controls preserve identity and remain operable on portrait mobile', async \(\{ page \}\) => \{[\s\S]*?\n  \}\)\n\n  test\('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile'/g
const currentKeyboardJourney = `  test('selected Life Map keyboard journey controls preserve identity and remain operable on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')
    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    await expect(actions).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advancedUrl = new URL(page.url())
    expect(advancedUrl.searchParams.get('memoryId')).toBe(advancedUrl.searchParams.get('node'))

    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })

    await page.keyboard.press('o')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview'), { timeout: 15_000 }).toBe('1')
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'overview', { timeout: 15_000 })
    await expect(actions).toHaveCount(0)
  })

  test('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile'`

const output = replaceRegex(
  input,
  staleJourneyRail,
  currentKeyboardJourney,
  1,
  'current Life Map keyboard journey controls without retired permanent rail',
)

await writeFile(path, output)
console.log(`Materialized current accessibility-performance v5 proof at ${path}`)

const evidencePath = 'urai-tier1/tests/accessibility-performance-evidence.spec.ts'
let evidence = await readFile(evidencePath, 'utf8')
const staleOrbFocus = /  test\('Orb menu enters focus, closes on Escape, and returns focus', async \(\{ page \}\) => \{[\s\S]*?\n  \}\)\n\n  test\('reduced motion removes active CSS animations from primary controls'/g
const currentOrbFocus = `  test('Orb menu enters focus, closes on Escape, and returns focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const companionRuntimeOrb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(companionRuntimeOrb).toBeEnabled({ timeout: 15_000 })
    await expect(page.locator('html')).toHaveAttribute('data-home-semantic-orb-bridge', 'ready', { timeout: 15_000 })
    const orb = page.getByRole('button', { name: 'Open URAI Orb companion', exact: true })
    await expect(orb).toBeVisible()
    await expect(orb).toBeEnabled()
    await orb.focus()
    await orb.press('Enter')
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'false', { timeout: 20_000 })
    const firstDestination = page.locator('#urai-world-companion-menu button:not([disabled])').first()
    await expect(firstDestination).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(orb).toBeFocused()
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'true')
  })

  test('reduced motion removes active CSS animations from primary controls'`
evidence = replaceRegex(evidence, staleOrbFocus, currentOrbFocus, 1, 'visible semantic Orb focus-return lifecycle')
await writeFile(evidencePath, evidence)
console.log(`Materialized authority-safe Orb focus proof at ${evidencePath}`)

const sensoryPath = 'urai-tier1/tests/accessibility-performance-home-sensory-boundary.spec.ts'
let sensory = await readFile(sensoryPath, 'utf8')
sensory = replaceRegex(
  sensory,
  /test\('production ambience remains silent before consent and activates only after explicit consent'/g,
  "test('candidate ambience remains unfetched while explicit consent state stays accessible'",
  1,
  'candidate audio authority proof title',
)
sensory = replaceRegex(
  sensory,
  /    await expect\.poll\(\(\) => ambienceRequests\.length, \{ timeout: 10_000 \}\)\.toBeGreaterThan\(0\)/g,
  `    await page.waitForTimeout(250)
    expect(ambienceRequests).toEqual([])`,
  1,
  'candidate audio must remain unfetched after consent',
)
await writeFile(sensoryPath, sensory)
console.log(`Materialized candidate-audio authority proof at ${sensoryPath}`)
